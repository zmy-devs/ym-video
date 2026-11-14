import { apiFetch } from '@/lib/api';
import type { RegistrationInput } from '@ym-video/account/schema';

// 提交已校验的注册字段，接口失败保留服务端说明。
export const registerInvitation = async (input: RegistrationInput) => {
  const response = await apiFetch('/api/v1/invitations/register', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body: { message: string } = await response.json();
    throw new Error(body.message);
  }
};
