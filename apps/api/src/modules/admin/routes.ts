import { Buffer } from 'node:buffer';
import type { FastifyInstance } from 'fastify';
import { HttpError } from '../../errors';
import type { Auth } from '../auth/auth';
import { requireAdmin } from '../auth/guard';
import { createAccount, parseAccount, parseListQuery } from './accounts';

// D1 列表查询只选择可公开的账号字段。
interface AccountRow {
  id: string;
  name: string;
  username: string | null;
  email: string;
  role: string;
  banned: number;
}

// 独立管理接口统一鉴权，所有变更均以数据库当前状态为准。
export const registerAdminRoutes = (
  app: FastifyInstance,
  auth: Auth,
  db: D1Database,
) => {
  app.register(
    async (admin) => {
      admin.addHook('onRequest', async (request) => {
        await requireAdmin(auth, request);
      });

      admin.get('/users', async (request) => {
        const { page, search, pageSize, offset } = parseListQuery(
          request.query,
        );
        const predicate =
          'instr(lower(coalesce(username, name)), lower(?)) > 0 OR instr(lower(email), lower(?)) > 0';
        const [count, rows] = await Promise.all([
          db
            .prepare(`SELECT count(*) AS total FROM user WHERE ${predicate}`)
            .bind(search, search)
            .first<{ total: number }>(),
          db
            .prepare(
              `SELECT id, name, username, email, coalesce(role, 'user') AS role, coalesce(banned, 0) AS banned FROM user WHERE ${predicate} ORDER BY createdAt DESC, id DESC LIMIT ? OFFSET ?`,
            )
            .bind(search, search, pageSize, offset)
            .all<AccountRow>(),
        ]);
        return {
          items: rows.results.map((row) => ({ ...row, banned: !!row.banned })),
          total: count?.total ?? 0,
          page,
          pageSize,
        };
      });

      admin.post('/users', async (request, reply) => {
        const input = parseAccount(request.body);
        // 该路由已校验管理员身份，未指定角色时仍创建普通用户。
        const body = request.body as Record<string, unknown>;
        const role = body.role === undefined ? 'user' : body.role;
        if (role !== 'user' && role !== 'admin') {
          throw new HttpError(400, 'INVALID_ROLE', '请选择用户或管理员');
        }
        const user = await createAccount(db, input, { role });
        return reply.code(201).send({ user });
      });

      admin.patch<{ Params: { id: string } }>('/users/:id', async (request) => {
        const { user: actor } = await requireAdmin(auth, request);
        const body = request.body;
        if (
          !body ||
          typeof body !== 'object' ||
          !('banned' in body) ||
          typeof body.banned !== 'boolean'
        ) {
          throw new HttpError(400, 'INVALID_STATUS', '请指定账号是否停用');
        }
        const banned = body.banned;
        const id = request.params.id;
        if (id === actor.id && banned) {
          throw new HttpError(409, 'SELF_PROTECTED', '不能停用当前管理员');
        }
        // 条件放在写入语句内，两个管理员并发操作也不会停用最后一人。
        const [result] = await db.batch([
          db
            .prepare(
              "UPDATE user SET banned = ?, banReason = ?, banExpires = NULL, updatedAt = ? WHERE id = ? AND (? = 0 OR role IS NOT 'admin' OR banned = 1 OR (SELECT count(*) FROM user WHERE role = 'admin' AND coalesce(banned, 0) = 0) > 1)",
            )
            .bind(
              banned ? 1 : 0,
              banned ? '管理员停用' : null,
              Date.now(),
              id,
              banned ? 1 : 0,
            ),
          db
            .prepare(
              'DELETE FROM session WHERE userId = ? AND EXISTS (SELECT 1 FROM user WHERE id = ? AND banned = ?)',
            )
            .bind(id, id, banned ? 1 : 0),
        ]);
        if (!result.meta.changes) {
          const exists = await db
            .prepare('SELECT id FROM user WHERE id = ?')
            .bind(id)
            .first();
          throw new HttpError(
            exists ? 409 : 404,
            exists ? 'LAST_ADMIN' : 'USER_NOT_FOUND',
            exists ? '不能停用最后一个可用管理员' : '账号不存在',
          );
        }
        return { success: true };
      });

      admin.delete<{ Params: { id: string } }>(
        '/users/:id',
        async (request) => {
          const { user: actor } = await requireAdmin(auth, request);
          const id = request.params.id;
          if (id === actor.id) {
            throw new HttpError(409, 'SELF_PROTECTED', '不能删除当前管理员');
          }
          const result = await db
            .prepare(
              "DELETE FROM user WHERE id = ? AND (role IS NOT 'admin' OR banned = 1 OR (SELECT count(*) FROM user WHERE role = 'admin' AND coalesce(banned, 0) = 0) > 1)",
            )
            .bind(id)
            .run();
          if (!result.meta.changes) {
            const exists = await db
              .prepare('SELECT id FROM user WHERE id = ?')
              .bind(id)
              .first();
            throw new HttpError(
              exists ? 409 : 404,
              exists ? 'LAST_ADMIN' : 'USER_NOT_FOUND',
              exists ? '不能删除最后一个可用管理员' : '账号不存在',
            );
          }
          return { success: true };
        },
      );

      admin.get('/invitations', async (request) => {
        const { page, search, pageSize, offset } = parseListQuery(
          request.query,
        );
        // 备注名称、完整链接和单独 token 均可搜索，来源域名不参与筛选。
        const keyword = search.includes('/invite/')
          ? (search.split('/invite/').pop() ?? '')
          : search;
        const [count, rows] = await Promise.all([
          db
            .prepare(
              'SELECT count(*) AS total FROM invitation WHERE instr(lower(name), lower(?)) > 0 OR instr(token, ?) > 0',
            )
            .bind(keyword, keyword)
            .first<{ total: number }>(),
          db
            .prepare(
              'SELECT id, name, token, created_at AS createdAt, used_at AS usedAt FROM invitation WHERE instr(lower(name), lower(?)) > 0 OR instr(token, ?) > 0 ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?',
            )
            .bind(keyword, keyword, pageSize, offset)
            .all(),
        ]);
        return {
          items: rows.results,
          total: count?.total ?? 0,
          page,
          pageSize,
        };
      });

      admin.post('/invitations', async (request, reply) => {
        // 分享名称仅供后台备注，校验成功后才生成并保存链接。
        const body = request.body;
        const name =
          body &&
          typeof body === 'object' &&
          'name' in body &&
          typeof body.name === 'string'
            ? body.name.trim()
            : '';
        if (!name || name.length > 80) {
          throw new HttpError(
            400,
            'INVALID_INVITATION_NAME',
            '分享名称需为 1～80 个字符',
          );
        }
        const id = crypto.randomUUID();
        // 128 位安全随机数编码为 22 位 URL 安全字符，缩短邀请链接。
        const token = Buffer.from(
          crypto.getRandomValues(new Uint8Array(16)),
        ).toString('base64url');
        const createdAt = Date.now();
        await db
          .prepare(
            'INSERT INTO invitation (id, name, token, created_at) VALUES (?, ?, ?, ?)',
          )
          .bind(id, name, token, createdAt)
          .run();
        return reply
          .code(201)
          .send({ invitation: { id, name, token, createdAt, usedAt: null } });
      });

      admin.delete<{ Params: { id: string } }>(
        '/invitations/:id',
        async (request) => {
          const result = await db
            .prepare('DELETE FROM invitation WHERE id = ?')
            .bind(request.params.id)
            .run();
          if (!result.meta.changes) {
            throw new HttpError(404, 'INVITATION_NOT_FOUND', '邀请链接不存在');
          }
          return { success: true };
        },
      );
    },
    { prefix: '/api/v1/admin' },
  );
};
