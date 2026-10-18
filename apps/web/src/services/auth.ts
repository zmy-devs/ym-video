import { createAuthClient } from 'better-auth/vue';
import { usernameClient } from 'better-auth/client/plugins';

// 开发代理与生产同域共用 Cookie 会话，不在本地保存登录令牌。
export const authClient = createAuthClient({
  baseURL: window.location.origin,
  plugins: [usernameClient({ displayUsername: false })],
});

// 去除账号首尾空白，根据邮箱标记选择登录方式，密码保持原样。
export const signIn = (account: string, password: string) => {
  // 用户名不允许 @，两种标识不会混淆。
  const identifier = account.trim();

  if (identifier.includes('@')) {
    return authClient.signIn.email({ email: identifier, password });
  }

  return authClient.signIn.username({ username: identifier, password });
};
