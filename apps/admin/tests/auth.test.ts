import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMemoryHistory, createRouter } from 'vue-router';
import { getLoginRedirect } from '@ym-video/account/navigation';

// Admin 登录测试只注册管理应用拥有的受保护路径。
const createAdminRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/users',
        name: 'users',
        component: { render: () => null },
        meta: { requiresAuth: true },
      },
      {
        path: '/invitations',
        name: 'invitations',
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

test('Admin 登录回跳保留管理页面、查询条件和锚点', () => {
  const router = createAdminRouter();
  const redirect = getLoginRedirect(
    router,
    '/invitations?search=video#results',
    'users',
  );

  assert.equal(redirect.name, 'invitations');
  assert.deepEqual(redirect.query, { search: 'video' });
  assert.equal(redirect.hash, '#results');
  assert.equal(redirect.replace, true);
});

test('Admin 登录回跳拒绝外部地址、登录循环和影视应用路径', () => {
  const router = createAdminRouter();

  for (const value of [
    undefined,
    ['/users'],
    '//untrusted.example',
    '/\\untrusted.example',
    'https://untrusted.example',
    '/login',
    '/overview',
    '/admin/users',
  ]) {
    assert.equal(getLoginRedirect(router, value, 'users').name, 'users');
  }
});
