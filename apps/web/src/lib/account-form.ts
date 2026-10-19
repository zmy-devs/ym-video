// 创建账号和邀请注册共用字段校验，客户端提示与服务端规则一致。
export interface AccountDraft {
  username: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

// 字段错误替换对应标签，其他请求错误保留在表单反馈区域。
export type AccountFieldErrors = Partial<Record<keyof AccountDraft, string>>;

// 用户名支持各语言文字和数字，并保留已有符号与长度限制。
export const isValidUsername = (username: string) =>
  /^[\p{L}\p{N}_.]{3,30}$/u.test(username);

// 注册时额外验证确认密码；密码本身不做去空白或大小写变换。
export const validateAccountForm = (
  input: AccountDraft,
  confirmation = false,
) => {
  const errors: AccountFieldErrors = {};

  if (!isValidUsername(input.username.trim())) {
    errors.username = '用户名需为 3～30 位中英文、数字、下划线或句点';
  }

  if (
    input.email.trim().length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(input.email.trim())
  ) {
    errors.email = '请输入有效的邮箱地址';
  }

  if (input.password.length < 6 || input.password.length > 128) {
    errors.password = '密码长度需为 6～128 位';
  }

  if (confirmation && input.password !== input.confirmPassword) {
    errors.confirmPassword = '两次输入的密码不一致';
  }

  return errors;
};

// 服务端判重和输入校验映射到具体字段，不改变表单布局。
export const getAccountFieldErrors = (
  code: string,
  message: string,
): AccountFieldErrors => {
  if (['INVALID_USERNAME', 'USERNAME_EXISTS'].includes(code)) {
    return { username: message };
  }
  if (['INVALID_EMAIL', 'EMAIL_EXISTS'].includes(code)) {
    return { email: message };
  }
  if (code === 'INVALID_PASSWORD') {
    return { password: message };
  }
  if (code === 'PASSWORD_MISMATCH') {
    return { confirmPassword: message };
  }
  return {};
};
