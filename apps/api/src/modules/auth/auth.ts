import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { createDatabase } from '../../db';
import type { AuthConfig } from '../../env';
import * as schema from '../../db/schema/auth';
import { authOptions } from './options';

export const createAuth = (env: Env, config: AuthConfig) =>
  betterAuth({
    ...authOptions,
    appName: 'ym-video',
    baseURL: config.baseURL,
    basePath: '/api/auth',
    secret: config.secret,
    database: drizzleAdapter(createDatabase(env.DB), {
      provider: 'sqlite',
      schema,
      transaction: false,
    }),
    trustedOrigins: [...config.webOrigins, 'ymvideo://'],
    advanced: { useSecureCookies: config.secureCookies },
    // 请求限流由 Workers binding 实施，不使用 isolate 内的内存计数器。
    rateLimit: { enabled: false },
  });

export type Auth = ReturnType<typeof createAuth>;
