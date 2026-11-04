import type { LocationQuery, RouteRecordName, Router } from 'vue-router';

// 登录回跳使用当前应用已注册的业务路由，保留参数、查询和锚点。
export const getLoginRedirect = (
  router: Router,
  value: LocationQuery['redirect'],
  home: RouteRecordName,
) => {
  if (typeof value !== 'string') {
    return { name: home, replace: true };
  }

  // 通过路由元信息确认目标权限，再用命名路由生成站内地址。
  const target = router.resolve(value);

  if (!target.name || !target.meta.requiresAuth) {
    return { name: home, replace: true };
  }

  return {
    name: target.name,
    params: target.params,
    query: target.query,
    hash: target.hash,
    replace: true,
  };
};
