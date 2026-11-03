import { createAuthClient } from 'better-auth/vue';
import { adminClient, usernameClient } from 'better-auth/client/plugins';
import { retryRequest } from '@/lib/request-retry';
import { apiFetch, webOrigin } from '@/lib/desktop';

// 开发代理与生产同域共用 Cookie 会话，不在本地保存登录令牌。
export const authClient = createAuthClient({
  baseURL: webOrigin,
  // 单次请求超时由对应流程继续重试或反馈。
  fetchOptions: { timeout: 10_000, customFetchImpl: apiFetch },
  plugins: [usernameClient({ displayUsername: false }), adminClient()],
});

// 复用已确认的账号，明确失效的会话不能沿用后台保留的旧数据。
export const getCachedUser = () => {
  // 临时网络错误保留账号；401、403 交由登录入口重新确认。
  const session = authClient.$store.atoms.session.get();

  if (session.error && [401, 403].includes(session.error.status)) {
    return undefined;
  }

  return session.data?.user;
};

// 首次会话验证最多重试五次，匿名或明确失效的会话直接进入登录。
export const verifySession = (signal: AbortSignal) =>
  retryRequest(
    async () => {
      // 单次验证独立计时，切换页面时立即取消旧请求。
      const result = await authClient.getSession({
        fetchOptions: {
          signal: AbortSignal.any([signal, AbortSignal.timeout(3000)]),
          retry: 0,
        },
      });

      if (result.error && ![401, 403].includes(result.error.status)) {
        throw result.error;
      }

      return result.data;
    },
    signal,
    4,
  );

// 邮箱登录保留密码原值，并允许页面取消正在执行的请求。
export const signIn = (
  email: string,
  password: string,
  signal?: AbortSignal,
) =>
  authClient.signIn.email({
    email: email.trim(),
    password,
    fetchOptions: { signal, retry: 0 },
  });
