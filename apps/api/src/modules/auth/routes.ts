import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyInstance } from 'fastify';
import type { Auth } from './auth';
import { requireSession } from './guard';

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
        if (key !== 'set-cookie') reply.header(key, value);
      }
      const cookies = response.headers.getSetCookie();
      if (cookies.length) reply.header('set-cookie', cookies);
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
      },
    };
  });
};
