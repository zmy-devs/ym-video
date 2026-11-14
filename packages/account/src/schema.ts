import { z } from 'zod';

// 账号字段与服务端的长度及字符规则保持一致。
export const usernameSchema = z
  .string()
  .trim()
  .regex(
    /^[\p{L}\p{N}_.]{3,30}$/u,
    '用户名需为 3～30 位中英文、数字、下划线或句点',
  );

export const emailSchema = z
  .string()
  .trim()
  .max(254, '请输入有效的邮箱地址')
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/u, '请输入有效的邮箱地址');

export const passwordSchema = z
  .string()
  .min(6, '密码长度需为 6～128 位')
  .max(128, '密码长度需为 6～128 位');

// 新建账号与邀请注册复用同一份字段规则。
export const accountSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const registrationSchema = accountSchema
  .extend({
    confirmPassword: z.string(),
    code: z.string().trim().min(1, '请输入邀请码').max(128, '邀请码无效'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: '两次输入的密码不一致',
  });

// 登录只要求提供密码，具体凭据由账号服务验证。
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, '请输入密码'),
});

// 用户名编辑与账号服务使用相同的规范化规则。
export const usernameFormSchema = z.object({
  username: usernameSchema.transform((value) => value.toLowerCase()),
});

// 密码修改保留原始输入，并统一检查两次新密码。
export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, '请输入当前密码'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    path: ['newPassword'],
    message: '新密码不能与当前密码相同',
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: '两次输入的密码不一致',
  });

// 邀请注册接口使用同一份经过校验的字段契约。
export type RegistrationInput = z.infer<typeof registrationSchema>;
