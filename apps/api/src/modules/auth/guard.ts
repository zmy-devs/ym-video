import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyRequest } from 'fastify';
import { HttpError } from '../../errors';
import type { Auth } from './auth';

export const requireSession = async (auth: Auth, request: FastifyRequest) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });
  if (!session) throw new HttpError(401, 'UNAUTHORIZED', '请先登录');
  return session;
};
