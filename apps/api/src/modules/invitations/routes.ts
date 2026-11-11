import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyInstance } from 'fastify';
import { HttpError } from '../../errors';
import type { Auth } from '../auth/auth';
import { createAccount, parseAccount } from '../admin/accounts';

// 匿名邀请码注册不开放普通注册入口，也不信任客户端身份字段。
export const registerInvitationRoutes = (
  app: FastifyInstance,
  auth: Auth,
  db: D1Database,
) => {
  app.post('/api/v1/invitations/register', async (request, reply) => {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
      query: { disableCookieCache: true },
    });
    if (session && !session.user.banned) {
      throw new HttpError(409, 'ALREADY_SIGNED_IN', '请先退出当前账号再注册');
    }

    if (
      !request.body ||
      typeof request.body !== 'object' ||
      Array.isArray(request.body) ||
      !('code' in request.body) ||
      typeof request.body.code !== 'string' ||
      !request.body.code.trim()
    ) {
      throw new HttpError(400, 'INVALID_INVITATION_CODE', '请输入邀请码');
    }

    const input = parseAccount(request.body, true);
    const user = await createAccount(db, input, {
      code: request.body.code.trim(),
    });
    return reply.code(201).send({ user });
  });
};
