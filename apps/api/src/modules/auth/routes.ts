import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyInstance } from 'fastify';
import type { Auth } from './auth';
import { requireSession } from './guard';
import { HttpError } from '../../errors';

export const registerAuthRoutes = (
  app: FastifyInstance,
  auth: Auth,
  baseURL: string,
) => {
  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    handler: async (request, reply) => {
      const url = new URL(request.url, baseURL);
      // 所有管理操作只能通过带保护约束的业务接口执行。
      const path = decodeURIComponent(url.pathname).replace(/\/+$/u, '');
      if (path === '/api/auth/admin' || path.startsWith('/api/auth/admin/')) {
        throw new HttpError(404, 'NOT_FOUND', '接口不存在');
      }
      // 覆盖登录与停用并发时迟到创建的会话，退出仍然可用。
      if (path !== '/api/auth/sign-out') {
        const session = await auth.api.getSession({
          headers: fromNodeHeaders(request.headers),
          query: { disableCookieCache: true },
        });
        if (session?.user.banned) {
          throw new HttpError(
            401,
            'ACCOUNT_DISABLED',
            '账号已停用，请联系管理员',
          );
        }
      }
      const headers = fromNodeHeaders(request.headers);
      const hasBody = request.method === 'POST' && request.body !== undefined;
      if (hasBody) {
        headers.delete('content-length');
        headers.set('content-type', 'application/json');
      }
      const response = await auth.handler(
        new Request(url, {
          method: request.method,
          headers,
          ...(hasBody ? { body: JSON.stringify(request.body) } : {}),
        }),
      );
      reply.code(response.status);
      for (const [key, value] of response.headers) {
        if (key !== 'set-cookie') {
          reply.header(key, value);
        }
      }
      const cookies = response.headers.getSetCookie();
      if (cookies.length) {
        reply.header('set-cookie', cookies);
      }
      return reply.send(response.body);
    },
  });

  app.get('/api/v1/me', async (request) => {
    const { user } = await requireSession(auth, request);
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image ?? null,
        username: user.username ?? null,
        role: user.role ?? 'user',
        banned: user.banned ?? false,
      },
    };
  });
};
