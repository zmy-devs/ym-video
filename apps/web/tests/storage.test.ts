import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import { toast } from 'vue-sonner';
import { readLocal, writeLocal } from '../src/lib/storage.ts';

// 测试只替换当前 Node 进程的存储，不接触浏览器数据。
afterEach(() => {
  Reflect.deleteProperty(globalThis, 'localStorage');
  mock.restoreAll();
});

test('浏览器存储拒绝访问时回退默认值，写入失败不抛出异常且只提示一次', () => {
  const notification = mock.method(toast, 'error', () => 'test-toast');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get: () => {
      throw new Error('Storage access denied');
    },
  });
  assert.equal(
    readLocal(
      'volume',
      1,
      (value): value is number => typeof value === 'number',
    ),
    1,
  );
  assert.equal(writeLocal('volume', 0.5), false);
  assert.equal(writeLocal('searches', ['测试']), false);
  assert.equal(notification.mock.callCount(), 1);
});

test('损坏或类型不符的本地设置不会进入页面状态', () => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: () => '"invalid-volume"' },
  });
  assert.equal(
    readLocal(
      'volume',
      1,
      (value): value is number => typeof value === 'number',
    ),
    1,
  );
});
