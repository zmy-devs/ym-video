import Fastify from 'fastify';
import { HttpError, registerErrorHandlers } from './errors';
import { getAuthConfig } from './env';
import { createAuth } from './modules/auth/auth';
import { registerAuthRoutes } from './modules/auth/routes';
import { registerProxyRoutes } from './modules/proxy/routes';
import { registerUserDataRoutes } from './modules/user-data/routes';
import { registerAdminRoutes } from './modules/admin/routes';
import { registerInvitationRoutes } from './modules/invitations/routes';

export const createApp = (env: Env) => {
  const config = getAuthConfig(env);
  const app = Fastify({
    logger: false,
    bodyLimit: 16 * 1024,
    disableRequestLogging: true,
    pluginTimeout: 0,
  });
  const auth = createAuth(env, config);
  registerErrorHandlers(app);

  app.addHook('onRequest', async (request, reply) => {
    reply.header('cache-control', 'no-store');
    reply.header('x-content-type-options', 'nosniff');
    const origin = request.headers.origin;
    if (origin) {
      if (!config.webOrigins.includes(origin))
        throw new HttpError(403, 'ORIGIN_NOT_ALLOWED', '请求来源不受信任');
      reply.header('access-control-allow-origin', origin);
      reply.header('access-control-allow-credentials', 'true');
      reply.header('vary', 'Origin');
    }
    if (request.method === 'OPTIONS') {
      reply.header(
        'access-control-allow-methods',
        'GET,POST,PATCH,DELETE,OPTIONS',
      );
      reply.header(
        'access-control-allow-headers',
        'Content-Type,Authorization,Expo-Origin',
      );
      reply.header('access-control-max-age', '600');
      return reply.code(204).send();
    }

    const path = request.url.split('?', 1)[0];
    const limiter =
      path.startsWith('/api/auth/') ||
      path === '/api/v1/me' ||
      path.startsWith('/api/v1/admin/') ||
      path.startsWith('/api/v1/invitations/') ||
      path.startsWith('/api/v1/history')
        ? env.AUTH_RATE_LIMITER
        : path.startsWith('/api/v1/proxy/')
          ? env.PROXY_RATE_LIMITER
          : null;
    if (limiter) {
      const ip = request.headers['cf-connecting-ip'];
      const { success } = await limiter.limit({
        key: typeof ip === 'string' ? ip : 'local',
      });
      if (!success) {
        reply.header('retry-after', '60');
        throw new HttpError(429, 'RATE_LIMITED', '请求过于频繁，请稍后重试');
      }
    }
  });

  app.options('/*', (_request, reply) => reply.code(204).send());
  app.get('/api/v1/health', () => ({ status: 'ok' }));
  registerAuthRoutes(app, auth, config.baseURL);
  registerAdminRoutes(app, auth, env.DB);
  registerInvitationRoutes(app, auth, env.DB);
  registerUserDataRoutes(app, auth, env.DB);
  registerProxyRoutes(app);
  return app;
};
