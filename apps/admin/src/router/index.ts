import { createRouter, createWebHistory } from 'vue-router';
import { registerGuards } from './guards';

// 管理端的浏览器路径统一位于 /admin/。
export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/login.vue'),
      meta: { title: '管理员登录' },
    },
    {
      path: '/',
      meta: { sidebar: true, requiresAuth: true },
      children: [
        { path: '', redirect: { name: 'users' } },
        {
          path: 'users',
          name: 'users',
          component: () => import('@/views/users.vue'),
          meta: { title: '账号管理' },
        },
        {
          path: 'invitations',
          name: 'invitations',
          component: () => import('@/views/invitations.vue'),
          meta: { title: '邀请管理' },
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: { name: 'users' } },
  ],
});
registerGuards(router);
