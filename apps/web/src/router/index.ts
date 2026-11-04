import { createRouter, createWebHistory } from 'vue-router';
import { registerGuards } from './guards';

// Web 路由可直接刷新，静态托管负责 SPA 回退。
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/invite/:token',
      name: 'invite',
      component: () => import('@/views/invite.vue'),
      meta: { title: '邀请注册' },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/login.vue'),
      meta: { title: '登录' },
    },
    {
      path: '/',
      meta: { sidebar: true, requiresAuth: true },
      children: [
        { path: '', redirect: { name: 'overview' } },
        {
          path: 'overview',
          name: 'overview',
          component: () => import('@/views/catalogue.vue'),
          meta: { title: '概览', keepAlive: true },
        },
        {
          path: 'category/:id?',
          name: 'category',
          component: () => import('@/views/catalogue.vue'),
          meta: { title: '分类' },
        },
        {
          path: 'search',
          name: 'search',
          component: () => import('@/views/catalogue.vue'),
          meta: { title: '搜索' },
        },
        {
          path: 'history',
          name: 'history',
          component: () => import('@/views/history.vue'),
          meta: { title: '观看历史' },
        },
      ],
    },
    {
      path: '/player/:sourceId/:vodId',
      name: 'player',
      component: () => import('@/views/player.vue'),
      meta: { title: '播放器', requiresAuth: true },
    },
    { path: '/:pathMatch(.*)*', redirect: { name: 'overview' } },
  ],
});

registerGuards(router);
