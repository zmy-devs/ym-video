import { createRouter, createWebHistory } from 'vue-router';
import AppLayout from '@/layout/index.vue';

// Web 路由可直接刷新，静态托管负责 SPA 回退。
export const router = createRouter({
  history: createWebHistory(),
  routes: [
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

// 播放页由影片信息设置标题，其他页面使用路由名称。
router.afterEach((to) => {
  if (to.name !== 'player') {
    document.title = `${String(to.meta.title ?? '影视')} · ym-video`;
  }
});
