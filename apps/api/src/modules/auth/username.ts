// 用户名允许各语言文字和数字，长度与保留符号沿用原规则。
export const isValidUsername = (username: string) =>
  /^[\p{L}\p{N}_.]{3,30}$/u.test(username);
