import { createRouter, createWebHistory } from 'vue-router';
import AppLayout from '@/layout/index.vue';
import { authClient, getCachedUser, verifySession } from '@/services/auth';
import { getLoginReturnPath } from '@/lib/auth';
import { errorToast } from '@/utils/toast';

// Web 路由可直接刷新，静态托管负责 SPA 回退。
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/invite/:token',
      name: 'invite',
      component: () => import('@/views/invite.vue'),
      meta: { title: '邀请注册', public: true },
    },
    {
      path: '/admin',
      component: () => import('@/layout/admin-layout.vue'),
      meta: { admin: true, sidebar: true },
      children: [
        { path: '', redirect: '/admin/users' },
        {
          path: 'users',
          component: () => import('@/views/admin/users.vue'),
          meta: { title: '账号管理' },
        },
        {
          path: 'invitations',
          component: () => import('@/views/admin/invitations.vue'),
          meta: { title: '邀请管理' },
        },
      ],
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/login.vue'),
      meta: { title: '登录' },
    },
    {
      path: '/',
      component: AppLayout,
      meta: { sidebar: true },
      children: [
        { path: '', redirect: '/overview' },
        {
          path: 'overview',
          component: () => import('@/views/catalogue.vue'),
          meta: { title: '概览', keepAlive: true },
        },
        {
          path: 'category/:id?',
          component: () => import('@/views/catalogue.vue'),
          meta: { title: '分类' },
        },
        {
          path: 'search',
          component: () => import('@/views/catalogue.vue'),
          meta: { title: '搜索' },
        },
        {
          path: 'history',
          component: () => import('@/views/history.vue'),
          meta: { title: '观看历史' },
        },
      ],
    },
    {
      path: '/player/:sourceId/:vodId',
      name: 'player',
      component: () => import('@/views/player.vue'),
      meta: { title: '播放器' },
    },
    { path: '/:pathMatch(.*)*', redirect: '/overview' },
  ],
});

// 新导航会取消上一轮会话验证及重试等待。
let sessionController: AbortController | undefined;

// 首次进入时确认会话，后续导航复用账号状态，避免播放等待重复验证。
router.beforeEach(async (to, from) => {
  sessionController?.abort();
  sessionController = new AbortController();

  // 当前导航的取消信号，旧校验不能弹出迟到的失败提示。
  const signal = sessionController.signal;

  // 登录回退已经检查过会话，不再次等待不可用的服务。
  if (to.meta.public || (to.name === 'login' && to.redirectedFrom)) {
    return true;
  }
  // 后台页间切换由管理接口逐次校验权限，不重复等待会话请求。
  if (from.meta.admin && to.meta.admin) {
    return true;
  }
  try {
    // 已确认的会话由 Better Auth 在后台刷新，不阻塞前台页面切换。
    let user = getCachedUser();

    if (!user) {
      // 每次最多等待三秒，五次都失败后保留可操作的登录入口。
      const result = await verifySession(signal);

      if (result) {
        authClient.hydrateSession(result);
        user = result.user;
      }
    }

    if (user) {
      if (user.role === 'admin' && !to.meta.admin) {
        return getLoginReturnPath(to.query.redirect, 'admin');
      }
      if (to.meta.admin && user.role !== 'admin') {
        return '/overview';
      }
      return to.name === 'login'
        ? getLoginReturnPath(to.query.redirect, user.role)
        : true;
    }
  } catch {
    if (signal.aborted) {
      return false;
    }

    // 重走原目标的路由守卫，登录页本身也允许强制重试。
    const handleRetry = () =>
      router
        .replace({ path: to.path, query: to.query, hash: to.hash, force: true })
        .catch(() => {
          errorToast('无法重新验证登录状态，请重试');
        });

    errorToast('登录状态验证失败，请重试', {
      id: 'session-check-error',
      action: { label: '重试', onClick: handleRetry },
    });
    // 服务不可用时保留登录入口，提示按钮可重新验证原目标。
    return to.name === 'login'
      ? true
      : { name: 'login', query: { redirect: to.fullPath }, replace: true };
  }

  return to.name === 'login'
    ? true
    : { name: 'login', query: { redirect: to.fullPath }, replace: true };
});

// 前台统一品牌标题，后台保留管理页名称。
router.afterEach((to) => {
  document.title = to.meta.admin
    ? `${String(to.meta.title ?? '影视')} · ym-video`
    : 'Ym Video';
});
