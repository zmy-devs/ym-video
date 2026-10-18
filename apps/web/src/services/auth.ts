import { createAuthClient } from 'better-auth/vue';

// 开发代理与生产同域共用 Cookie 会话，不在本地保存登录令牌。
export const authClient = createAuthClient({ baseURL: window.location.origin });
