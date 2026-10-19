// 登录回跳只接受站内地址，避免跳往外部站点或再次进入登录页。
export const getLoginReturnPath = (value: unknown, role?: string | null) => {
  // 管理员只进入后台，普通账号保留原来的影视页面回跳。
  const home = role === 'admin' ? '/admin/users' : '/overview';
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\')
  ) {
    return home;
  }

  // URL 解析统一处理相对路径片段，保留站内查询与锚点。
  const target = new URL(value, 'https://ym-video.invalid');

  if (
    target.origin !== 'https://ym-video.invalid' ||
    target.pathname.startsWith('//') ||
    target.pathname.replace(/\/+$/, '') === '/login'
  ) {
    return home;
  }

  // 站内回跳仍需匹配账号所属的前台或后台。
  const adminPath =
    target.pathname === '/admin' || target.pathname.startsWith('/admin/');
  if ((role === 'admin' && !adminPath) || (role !== 'admin' && adminPath)) {
    return home;
  }

  return `${target.pathname}${target.search}${target.hash}`;
};
