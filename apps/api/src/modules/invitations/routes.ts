import type { FastifyInstance } from 'fastify';
import { fromNodeHeaders } from 'better-auth/node';
import { HttpError } from '../../errors';
import type { Auth } from '../auth/auth';
import { createAccount, parseAccount } from '../admin/accounts';

// 匿名邀请查询和注册不开放普通注册入口，也不信任客户端身份字段。
export const registerInvitationRoutes = (
  app: FastifyInstance,
  auth: Auth,
  db: D1Database,
) => {
  app.get<{ Params: { token: string } }>(
    '/api/v1/invitations/:token',
    async (request) => {
      const invitation = await db
        .prepare('SELECT used_at AS usedAt FROM invitation WHERE token = ?')
        .bind(request.params.token)
        .first<{ usedAt: number | null }>();
      if (!invitation) {
        throw new HttpError(
          404,
          'INVITATION_NOT_FOUND',
          '邀请链接已删除或不存在',
        );
      }
      return { status: invitation.usedAt === null ? 'unused' : 'used' };
    },
  );

  app.post<{ Params: { token: string } }>(
    '/api/v1/invitations/:token/register',
    async (request, reply) => {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
        query: { disableCookieCache: true },
      });
      if (session && !session.user.banned) {
        throw new HttpError(409, 'ALREADY_SIGNED_IN', '请先退出当前账号再注册');
      }
      const input = parseAccount(request.body, true);
      const user = await createAccount(db, input, {
        token: request.params.token,
      });
      return reply.code(201).send({ user });
    },
  );
};
