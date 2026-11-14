import { z } from 'zod';

// 邀请备注在提交时统一去掉首尾空格。
export const invitationFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, '分享名称需为 1～80 个字符')
    .max(80, '分享名称需为 1～80 个字符'),
});
