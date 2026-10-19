import { hashPassword } from 'better-auth/crypto';
import { HttpError } from '../../errors';
import { isValidUsername } from '../auth/username';

// 后台创建与邀请注册共享账号输入校验，角色由各自接口控制。
export const parseAccount = (body: unknown, confirmation = false) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'INVALID_ACCOUNT', '请填写账号信息');
  }
  const input = body as Record<string, unknown>;
  const username =
    typeof input.username === 'string'
      ? input.username.trim().toLowerCase()
      : '';
  const email =
    typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  if (!isValidUsername(username)) {
    throw new HttpError(
      400,
      'INVALID_USERNAME',
      '用户名需为 3～30 位中英文、数字、下划线或句点',
    );
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    throw new HttpError(400, 'INVALID_EMAIL', '请输入有效的邮箱地址');
  }
  if (password.length < 6 || password.length > 128) {
    throw new HttpError(400, 'INVALID_PASSWORD', '密码长度需为 6～128 位');
  }
  if (confirmation && input.confirmPassword !== password) {
    throw new HttpError(400, 'PASSWORD_MISMATCH', '两次输入的密码不一致');
  }
  return { username, email, password };
};

// 数据库唯一约束也覆盖并发创建，避免只依赖提前查询。
export const accountConflict = (error: unknown): never => {
  const message =
    error instanceof Error
      ? `${error.message} ${error.cause instanceof Error ? error.cause.message : ''}`
      : '';
  if (/UNIQUE constraint failed: user\.username/iu.test(message)) {
    throw new HttpError(409, 'USERNAME_EXISTS', '用户名已被使用');
  }
  if (/UNIQUE constraint failed: user\.email/iu.test(message)) {
    throw new HttpError(409, 'EMAIL_EXISTS', '邮箱已被使用');
  }
  throw error;
};

// 凭据使用 Better Auth 的哈希和 credential 格式，并与账号原子写入。
export const createAccount = async (
  db: D1Database,
  input: ReturnType<typeof parseAccount>,
  options: { token?: string; role?: 'user' | 'admin' } = {},
) => {
  // 邀请永远创建普通用户；仅已鉴权的后台接口可以指定管理员。
  const { token } = options;
  const role = token ? 'user' : (options.role ?? 'user');
  // 兼容旧数据中的大小写；新写入统一小写，唯一约束负责并发判重。
  const existing = await db
    .prepare(
      'SELECT username, email FROM user WHERE lower(username) = ? OR lower(email) = ? LIMIT 1',
    )
    .bind(input.username, input.email)
    .first<{ username: string | null; email: string }>();
  if (existing) {
    if (existing.username?.toLowerCase() === input.username) {
      throw new HttpError(409, 'USERNAME_EXISTS', '用户名已被使用');
    }
    throw new HttpError(409, 'EMAIL_EXISTS', '邮箱已被使用');
  }
  const id = crypto.randomUUID();
  const now = Date.now();
  const password = await hashPassword(input.password);
  const values = [
    id,
    input.username,
    input.email,
    now,
    now,
    input.username,
    role,
  ];
  const insertUser = token
    ? db
        .prepare(
          'INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt, username, role, banned) SELECT ?, ?, ?, 0, ?, ?, ?, ?, 0 FROM invitation WHERE token = ? AND used_at IS NULL',
        )
        .bind(...values, token)
    : db
        .prepare(
          'INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt, username, role, banned) VALUES (?, ?, ?, 0, ?, ?, ?, ?, 0)',
        )
        .bind(...values);
  const statements = [
    insertUser,
    db
      .prepare(
        "INSERT INTO account (id, accountId, providerId, userId, password, createdAt, updatedAt) SELECT ?, id, 'credential', id, ?, ?, ? FROM user WHERE id = ?",
      )
      .bind(crypto.randomUUID(), password, now, now, id),
  ];
  if (token) {
    statements.push(
      db
        .prepare(
          'UPDATE invitation SET used_at = ?, used_by_id = ? WHERE token = ? AND used_at IS NULL AND EXISTS (SELECT 1 FROM user WHERE id = ?)',
        )
        .bind(now, id, token, id),
    );
  }
  try {
    const results = await db.batch(statements);
    if (results[0].meta.changes !== 1) {
      throw new HttpError(
        409,
        'INVITATION_UNAVAILABLE',
        '邀请链接已使用或已删除',
      );
    }
  } catch (error) {
    accountConflict(error);
  }
  return {
    id,
    username: input.username,
    email: input.email,
    role,
    banned: false,
  };
};

// 两类列表共用固定分页与字面量关键词，限制无效查询。
export const parseListQuery = (query: unknown) => {
  const input = query as Record<string, unknown>;
  const page = input.page === undefined ? 1 : Number(input.page);
  if (!Number.isSafeInteger(page) || page < 1 || page > 1_000_000) {
    throw new HttpError(400, 'INVALID_PAGE', '页码不正确');
  }
  const search =
    typeof input.search === 'string' ? input.search.trim().slice(0, 254) : '';
  return { page, search, pageSize: 20, offset: (page - 1) * 20 };
};
