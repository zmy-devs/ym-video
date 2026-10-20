import { createRouter, createWebHistory } from 'vue-router';
import AppLayout from '@/layout/index.vue';
import { authClient } from '@/services/auth';
import { getLoginReturnPath } from '@/lib/auth';

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

// 进入业务页面前确认服务端会话，登录后返回原来的站内页面。
router.beforeEach(async (to, from) => {
  // 登录回退已经检查过会话，不再次等待不可用的服务。
  if (to.meta.public || (to.name === 'login' && to.redirectedFrom)) {
    return true;
  }
  // 后台页间切换由管理接口逐次校验权限，不重复等待会话请求。
  if (from.meta.admin && to.meta.admin) {
    return true;
  }
  try {
    // 以服务端会话为准，3 秒无响应就取消请求并显示登录入口。
    const result = await authClient.getSession({
      fetchOptions: { signal: AbortSignal.timeout(3000) },
    });

    if (result.data?.user) {
      if (result.data.user.role === 'admin' && !to.meta.admin) {
        return getLoginReturnPath(to.query.redirect, 'admin');
      }
      if (to.meta.admin && result.data.user.role !== 'admin') {
        return '/overview';
      }
      return to.name === 'login'
        ? getLoginReturnPath(to.query.redirect, result.data.user.role)
        : true;
    }
  } catch {
    // 服务不可用时保留登录入口，由表单提供重试反馈。
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
