import { createAccountClient } from '@ym-video/account/client';

// 管理应用只使用浏览器 Cookie 会话。
export const authClient = createAccountClient(
  window.location.origin,
  window.fetch.bind(window),
);

// 读取已确认会话，过期和撤权结果交给路由守卫。
export const getCachedUser = () => {
  const session = authClient.$store.atoms.session.get();
  if (session.error && [401, 403].includes(session.error.status)) {
    return;
  }
  return session.data?.user;
};

// 管理导航确认服务端会话，明确失效时返回匿名结果。
export const verifySession = async (signal: AbortSignal) => {
  // 当前导航的请求由路由取消信号控制。
  const result = await authClient.getSession({
    fetchOptions: { signal, retry: 0 },
  });

  signal.throwIfAborted();

  if (result.error && ![401, 403].includes(result.error.status)) {
    throw result.error;
  }

  return result.data;
};
