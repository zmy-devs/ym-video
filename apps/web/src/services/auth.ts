import { createAuthClient } from 'better-auth/vue';
import { adminClient, usernameClient } from 'better-auth/client/plugins';

// 开发代理与生产同域共用 Cookie 会话，不在本地保存登录令牌。
export const authClient = createAuthClient({
  baseURL: window.location.origin,
  // 登录等请求超时后交由表单反馈，允许用户重新连接。
  fetchOptions: { timeout: 10_000 },
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

// 仅使用邮箱登录，去除邮箱首尾空白，密码保持原样。
export const signIn = (email: string, password: string) =>
  authClient.signIn.email({ email: email.trim(), password });
