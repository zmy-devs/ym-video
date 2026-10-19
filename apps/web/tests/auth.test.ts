import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getLoginReturnPath } from '../src/lib/auth.ts';
import {
  isValidUsername,
  validateAccountForm,
} from '../src/lib/account-form.ts';

test('用户名支持中英文和数字，保留长度与字符限制', () => {
  assert.equal(isValidUsername('煎bingguo子'), true);
  assert.equal(isValidUsername('Video影视2026'), true);
  assert.equal(isValidUsername('ab'), false);
  assert.equal(isValidUsername('a'.repeat(31)), false);
  assert.equal(isValidUsername('invalid name'), false);
  assert.equal(
    validateAccountForm({
      username: '中文User',
      email: 'user@example.com',
      password: '123456',
    }).username,
    undefined,
  );
});

test('登录后保留原业务页面、查询条件和锚点', () => {
  assert.equal(
    getLoginReturnPath('/search?wd=video#results'),
    '/search?wd=video#results',
  );
  assert.equal(
    getLoginReturnPath('/player/baofeng/123'),
    '/player/baofeng/123',
  );
});

test('回跳拒绝外部地址、无效参数和登录页循环', () => {
  for (const value of [
    undefined,
    ['/history'],
    'https://untrusted.example',
    '//untrusted.example',
    '/\\untrusted.example',
    '/\t/untrusted.example',
    '/history/..//untrusted.example',
    'javascript:alert(1)',
    '/login?redirect=/history',
    '/login/',
    '/history/../login',
  ]) {
    assert.equal(getLoginReturnPath(value), '/overview');
  }
});

test('管理员直接进入后台，普通用户不能回跳到后台', () => {
  for (const path of [
    undefined,
    '/overview',
    '/history',
    '/player/source/1',
    '/search?wd=test',
  ]) {
    assert.equal(getLoginReturnPath(path, 'admin'), '/admin/users');
  }
  assert.equal(
    getLoginReturnPath('/admin/invitations', 'admin'),
    '/admin/invitations',
  );
  assert.equal(getLoginReturnPath('/admin/users', 'user'), '/overview');
  assert.equal(getLoginReturnPath('/history', 'user'), '/history');
});
