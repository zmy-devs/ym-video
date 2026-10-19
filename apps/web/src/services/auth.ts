import { createAuthClient } from 'better-auth/vue';
import { adminClient, usernameClient } from 'better-auth/client/plugins';

// 开发代理与生产同域共用 Cookie 会话，不在本地保存登录令牌。
export const authClient = createAuthClient({
  baseURL: window.location.origin,
  plugins: [usernameClient({ displayUsername: false }), adminClient()],
});

// 仅使用邮箱登录，去除邮箱首尾空白，密码保持原样。
export const signIn = (email: string, password: string) =>
  authClient.signIn.email({ email: email.trim(), password });
