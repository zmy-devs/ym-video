import type { RouteLocationNormalized, Router } from 'vue-router';
import { getLoginRedirect } from '@ym-video/account/navigation';
import { errorToast } from '@ym-video/ui/lib/toast';
import { authClient, getCachedUser, verifySession } from '@/services/auth';

// 管理路由仅允许已确认的管理员会话进入。
export const registerGuards = (router: Router) => {
  // 新导航立即取消上一次尚未完成的会话请求。
  let controller: AbortController | undefined;

  // 登录入口直接显示，管理页面根据路由元信息执行鉴权。
  const handleNavigation = async (to: RouteLocationNormalized) => {
    controller?.abort();

    if (to.name === 'login' && getCachedUser()?.role === 'admin') {
      return getLoginRedirect(router, to.query.redirect, 'users');
    }

    if (!to.meta.requiresAuth) {
      return true;
    }

    // 登录回退统一保留原管理页面及其查询条件。
    const loginRoute = {
      name: 'login',
      query: { redirect: to.fullPath },
      replace: true,
    };

    // 已确认的账号直接复用，普通导航不重新请求会话。
    let user = getCachedUser();

    if (!user) {
      controller = new AbortController();

      // 异步结果只属于当前导航。
      const signal = controller.signal;

      try {
        // 会话服务统一解释匿名、撤权和网络错误。
        const session = await verifySession(signal);

        if (session) {
          authClient.hydrateSession(session);
        }

        user = session?.user;
      } catch {
        if (signal.aborted) {
          return false;
        }

        errorToast('无法验证管理员会话，请重新登录');

        return loginRoute;
      }
    }

    if (user?.role !== 'admin') {
      return loginRoute;
    }

    return true;
  };

  router.beforeEach(handleNavigation);

  // 浏览器标签页显示当前管理页面名称。
  router.afterEach((to) => {
    document.title = `${String(to.meta.title ?? '管理后台')} · Ym Video`;
  });
};
