import { createAuthClient } from 'better-auth/vue';
import { adminClient, usernameClient } from 'better-auth/client/plugins';

// 各应用提供自己的来源和传输，账号协议保持一致。
export const createAccountClient = (baseURL: string, transport: typeof fetch) =>
  createAuthClient({
    baseURL,
    fetchOptions: { timeout: 10_000, customFetchImpl: transport },
    plugins: [usernameClient({ displayUsername: false }), adminClient()],
  });

// 账号业务组件通过显式输入使用所属应用的会话。
export type AccountClient = ReturnType<typeof createAccountClient>;
