import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getLoginReturnPath } from '../src/lib/auth.ts';

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
