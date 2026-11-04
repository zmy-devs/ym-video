import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMemoryHistory, createRouter } from 'vue-router';
import { getLoginRedirect } from '@ym-video/account/navigation';

// Web 登录测试使用与应用相同的受保护路由元信息。
const createWebRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/overview',
        name: 'overview',
        component: { render: () => null },
        meta: { requiresAuth: true },
      },
      {
        path: '/search',
        name: 'search',
        component: { render: () => null },
        meta: { requiresAuth: true },
      },
      {
        path: '/history',
        name: 'history',
        component: { render: () => null },
        meta: { requiresAuth: true },
      },
      {
        path: '/player/:sourceId/:vodId',
        name: 'player',
        component: { render: () => null },
        meta: { requiresAuth: true },
      },
      { path: '/login', name: 'login', component: { render: () => null } },
      {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        component: { render: () => null },
      },
    ],
  });

test('Web 登录回跳保留业务页面、查询条件和锚点', () => {
  const router = createWebRouter();
  const redirect = getLoginRedirect(
    router,
    '/search?wd=video#results',
    'overview',
  );

  assert.equal(redirect.name, 'search');
  assert.deepEqual(redirect.query, { wd: 'video' });
  assert.equal(redirect.hash, '#results');
  assert.equal(redirect.replace, true);

  assert.equal(
    getLoginRedirect(router, '/player/source/123', 'overview').name,
    'player',
  );
});

test('Web 登录回跳拒绝外部地址、无效参数、登录循环和管理路径', () => {
  const router = createWebRouter();

  for (const value of [
    undefined,
    ['/history'],
    'https://untrusted.example',
    '//untrusted.example',
    '/\\untrusted.example',
    '/history/../login',
    'javascript:alert(1)',
    '/login?redirect=/history',
    '/admin/users',
    '/unknown',
  ]) {
    assert.equal(getLoginRedirect(router, value, 'overview').name, 'overview');
  }
});
