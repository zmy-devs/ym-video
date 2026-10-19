import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyRequest } from 'fastify';
import { HttpError } from '../../errors';
import type { Auth } from './auth';

export const requireSession = async (auth: Auth, request: FastifyRequest) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
    query: { disableCookieCache: true },
  });
  if (!session) {
    throw new HttpError(401, 'UNAUTHORIZED', '请先登录');
  }
  if (session.user.banned) {
    throw new HttpError(401, 'ACCOUNT_DISABLED', '账号已停用，请联系管理员');
  }
  return session;
};

// 管理权限始终以数据库中的当前会话为准。
export const requireAdmin = async (auth: Auth, request: FastifyRequest) => {
  const session = await requireSession(auth, request);
  if (session.user.role !== 'admin') {
    throw new HttpError(403, 'FORBIDDEN', '仅管理员可以访问后台');
  }
  return session;
};

// 观看历史仅属于普通用户，管理员账号不创建或同步历史。
export const requireUser = async (auth: Auth, request: FastifyRequest) => {
  const session = await requireSession(auth, request);
  if (session.user.role === 'admin') {
    throw new HttpError(403, 'USER_ONLY', '管理员账号不使用观看历史');
  }
  return session;
};
