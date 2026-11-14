import { z } from 'zod';
import { accountSchema } from '@ym-video/account/schema';

// 后台账号表单增加管理员可选择的角色。
export const createAccountSchema = accountSchema.extend({
  role: z.enum(['user', 'admin']),
});
