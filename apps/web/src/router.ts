import { createRouter, createWebHistory } from 'vue-router';
import AppLayout from '@/layout/index.vue';
import { authClient } from '@/services/auth';
import { getLoginReturnPath } from '@/lib/auth';

// Web 路由可直接刷新，静态托管负责 SPA 回退。
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/login.vue'),
      meta: { title: '登录' },
    },
    {
      path: '/',
      component: AppLayout,
      children: [
        { path: '', redirect: '/overview' },
        {
          path: 'overview',
          component: () => import('@/views/catalogue.vue'),
          meta: { title: '概览' },
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
        {
          path: 'settings',
          redirect: '/overview',
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
router.beforeEach(async (to) => {
  try {
    // 以 HttpOnly Cookie 对应的服务端会话为准。
    const result = await authClient.getSession();

    if (result.data?.user) {
      return to.name === 'login' ? getLoginReturnPath(to.query.redirect) : true;
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

// 播放页由影片信息设置标题，其他页面使用路由名称。
router.afterEach((to) => {
  if (to.name !== 'player') {
    document.title = `${String(to.meta.title ?? '影视')} · ym-video`;
  }
});
