// 登录回跳只接受站内地址，避免跳往外部站点或再次进入登录页。
export const getLoginReturnPath = (value: unknown) => {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\')
  ) {
    return '/overview';
  }

  // URL 解析统一处理相对路径片段，保留站内查询与锚点。
  const target = new URL(value, 'https://ym-video.invalid');

  if (
    target.origin !== 'https://ym-video.invalid' ||
    target.pathname.startsWith('//') ||
    target.pathname.replace(/\/+$/, '') === '/login'
  ) {
    return '/overview';
  }

  return `${target.pathname}${target.search}${target.hash}`;
};
