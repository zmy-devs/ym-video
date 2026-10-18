export const getAuthConfig = (env: Env) => {
  if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32) {
    throw new Error('BETTER_AUTH_SECRET 必须配置为至少 32 个字符的随机密钥');
  }

  const baseURL = new URL(env.BETTER_AUTH_URL);
  const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(
    baseURL.hostname,
  );

  if (
    baseURL.protocol !== 'https:' &&
    !(isLocal && baseURL.protocol === 'http:')
  ) {
    throw new Error('非本地环境的 BETTER_AUTH_URL 必须使用 HTTPS');
  }

  if (
    baseURL.username ||
    baseURL.password ||
    baseURL.pathname !== '/' ||
    baseURL.search ||
    baseURL.hash
  ) {
    throw new Error('BETTER_AUTH_URL 应为不含凭证和路径的 API 来源');
  }

  const webOrigins = env.WEB_ORIGINS.split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  for (const origin of webOrigins) {
    const url = new URL(origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) {
      throw new Error('WEB_ORIGINS 应为逗号分隔的 HTTP 来源');
    }
  }

  return {
    baseURL: baseURL.origin,
    secret: env.BETTER_AUTH_SECRET,
    webOrigins: [...new Set([baseURL.origin, ...webOrigins])],
    secureCookies: baseURL.protocol === 'https:',
  };
};

export type AuthConfig = ReturnType<typeof getAuthConfig>;
