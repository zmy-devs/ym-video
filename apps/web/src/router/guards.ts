import type { RouteLocationNormalized, Router } from 'vue-router';
import { getLoginRedirect } from '@ym-video/account/navigation';
import { errorToast } from '@ym-video/ui/lib/toast';
import { authClient, getCachedUser, verifySession } from '@/services/auth';

// 登录入口保持可访问，受保护页面保留完整回跳地址。
const getLoginRoute = (to: RouteLocationNormalized) => {
  if (to.name === 'login') {
    return true;
  }

  return { name: 'login', query: { redirect: to.fullPath }, replace: true };
};

// 提示会话验证失败，重试按钮重新导航到原目标。
const showSessionError = (router: Router, to: RouteLocationNormalized) => {
  // 强制执行守卫，让当前地址也能重新验证会话。
  const handleRetry = () =>
    router.replace({ path: to.fullPath, force: true }).catch(() => {
      errorToast('无法重新验证登录状态，请重试');
    });

  errorToast('登录状态验证失败，请重试', {
    id: 'session-check-error',
    action: { label: '重试', onClick: handleRetry },
  });
};

// 按路由权限检查会话，业务页面切换复用已确认的账号。
export const registerGuards = (router: Router) => {
  // 新导航取消上一轮验证及重试等待。
  let controller: AbortController | undefined;

  // 登录和注册页面直接显示，受保护页面首次进入时验证会话。
  const handleNavigation = async (to: RouteLocationNormalized) => {
    controller?.abort();

    if (to.name === 'register') {
      return true;
    }

    if (!to.meta.requiresAuth && to.name !== 'login') {
      return true;
    }

    // 后台会话刷新负责过期通知，不阻塞已登录用户切换页面。
    let user = getCachedUser();

    if (!user && to.meta.requiresAuth) {
      controller = new AbortController();

      // 单次导航独立持有信号，旧请求不能修改当前导航结果。
      const signal = controller.signal;

      try {
        // 会话服务负责超时与重试，守卫只处理最终结果。
        const session = await verifySession(signal);

        if (session) {
          authClient.hydrateSession(session);
        }

        user = session?.user;
      } catch {
        if (signal.aborted) {
          return false;
        }

        showSessionError(router, to);

        return getLoginRoute(to);
      }
    }

    if (!user) {
      return getLoginRoute(to);
    }

    if (user.role === 'admin') {
      return getLoginRoute(to);
    }

    if (to.name === 'login') {
      return getLoginRedirect(router, to.query.redirect, 'overview');
    }

    return true;
  };

  router.beforeEach(handleNavigation);

  // 影视应用使用固定品牌标题。
  router.afterEach(() => {
    document.title = 'Ym Video';
  });
};
