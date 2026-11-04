import assert from 'node:assert/strict';
import { test } from 'node:test';
import { effectScope } from 'vue';
import { StorageSerializers, useStorage } from '@vueuse/core';

test('VueUse 从 JSON 偏好恢复主题并同步写入', () => {
  const values = new Map([['ym-video:theme-mode', '"dark"']]);
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
  const scope = effectScope();
  try {
    scope.run(() => {
      const mode = useStorage<string>('ym-video:theme-mode', 'auto', storage, {
        serializer: StorageSerializers.object,
        flush: 'sync',
      });
      assert.equal(mode.value, 'dark');
      mode.value = 'light';
      assert.equal(values.get('ym-video:theme-mode'), '"light"');
    });
  } finally {
    scope.stop();
  }
});
