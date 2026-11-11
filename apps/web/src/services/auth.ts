import { createAccountClient } from '@ym-video/account/client';
import { retryRequest } from '@ym-video/account/request-retry';
import { apiFetch, apiOrigin } from '@/lib/desktop';

// 开发代理与生产同域共用 Cookie 会话，不在本地保存登录令牌。
export const authClient = createAccountClient(apiOrigin, apiFetch);

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

// 邀请注册完成后使用邮箱密码建立会话。
export const signIn = (email: string, password: string, signal?: AbortSignal) =>
  authClient.signIn.email({
    email: email.trim(),
    password,
    fetchOptions: { signal, retry: 0 },
  });
