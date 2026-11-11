import { onDeactivated, watch } from 'vue';
import type { Ref } from 'vue';
import { onBackButtonPress } from '@tauri-apps/api/app';
import { isTauri } from '@tauri-apps/api/core';
import { useMobileStatusBar } from '@/composables/use-mobile-status-bar';
import { isMobile } from '@/platform';

// 应用层为通用抽屉接入 Android 返回键和状态栏外观。
export const useMobileDrawer = (open: Ref<boolean>) => {
  if (!isMobile) {
    return;
  }

  useMobileStatusBar(true, open);

  watch(
    open,
    (value, _previous, onCleanup) => {
      if (!value || !isTauri()) {
        return;
      }

      // 原生返回沿用组件库的 Escape 行为，优先关闭最上层弹窗或抽屉。
      const listener = onBackButtonPress(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Escape',
            bubbles: true,
            cancelable: true,
          }),
        );
      });

      listener.catch(console.error);

      onCleanup(() => {
        listener.then((handle) => handle.unregister()).catch(console.error);
      });
    },
    { immediate: true },
  );

  // 缓存页面离开时关闭抽屉并释放原生监听。
  onDeactivated(() => {
    open.value = false;
  });
};
