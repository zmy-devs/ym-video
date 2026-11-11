import { createRouter, createWebHistory } from 'vue-router';
import { registerGuards } from './guards';
import { isMobile } from '@/platform';

// Desktop 与 Android 共用同一套路由和页面。
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
      path: '/register',
      name: 'register',
      component: () => import('@/views/register.vue'),
      meta: { title: '注册' },
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
          meta: { title: '概览', keepAlive: true, mobileNav: true },
        },
        {
          path: 'category/:id?',
          name: 'category',
          component: () => import('@/views/catalogue.vue'),
          meta: { title: '分类', keepAlive: true, mobileNav: true },
        },
        {
          path: 'search',
          name: 'search',
          component: isMobile
            ? () => import('@/views/search.vue')
            : () => import('@/views/catalogue.vue'),
          meta: {
            title: '搜索',
            keepAlive: isMobile,
            standalone: true,
            back: true,
          },
        },
        {
          path: 'history',
          name: 'history',
          component: () => import('@/views/history.vue'),
          meta: { title: '历史', keepAlive: true, mobileNav: true },
        },
      ],
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/settings.vue'),
      meta: { title: '设置', requiresAuth: true, standalone: true, back: true },
    },
    {
      path: '/player/:sourceId/:vodId',
      name: 'player',
      component: () => import('@/views/player.vue'),
      meta: { title: '播放器', requiresAuth: true, fullscreen: true },
    },
    { path: '/:pathMatch(.*)*', redirect: { name: 'overview' } },
  ],
});

registerGuards(router);
