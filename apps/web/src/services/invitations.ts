import { apiFetch } from '@/lib/desktop';
import type { RegistrationInput } from '@ym-video/account/schema';

// 提交已校验的注册字段，接口失败保留服务端说明。
export const registerInvitation = async (
  input: RegistrationInput,
) => {
  const response = await apiFetch('/api/v1/invitations/register', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body: unknown = await response.json();
    throw new Error(
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof body.message === 'string'
        ? body.message
        : '注册失败，请重试',
    );
  }
};
