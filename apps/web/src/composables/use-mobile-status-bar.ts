import { onActivated, onDeactivated, onScopeDispose, ref, toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import { createSharedComposable, watchImmediate } from '@vueuse/core';
import { isMobile } from '@/platform';
import { platformCapabilities } from '@/platform-capabilities';
import { useThemeStore } from '@/stores/theme-store';

// 当前显示的页面或抽屉决定状态栏样式，关闭后恢复外层状态。
const useStatusBarHeaders = createSharedComposable(() => {
  // 按显示顺序保留页面标题栏的滚动状态。
  const headers = ref(new Map<symbol, boolean>());

  // 内容位于顶部时跟随应用当前主题。
  const theme = useThemeStore();

  watchImmediate(
    () =>
      Array.from(headers.value.values()).at(-1) || theme.resolved === 'dark',
    (dark) => {
      platformCapabilities.setStatusBarStyle(dark).catch(console.error);
    },
  );

  return headers;
});

// 页面和弹层只在启用且可见时接管状态栏样式。
export const useMobileStatusBar = (
  dark: MaybeRefOrGetter<boolean>,
  enabled: MaybeRefOrGetter<boolean> = true,
) => {
  if (!isMobile) {
    return;
  }

  // 页面和弹层独立登记，隐藏或关闭后交还状态栏控制。
  const headers = useStatusBarHeaders();

  const id = Symbol('mobile-status-bar');

  // 缓存标题栏只在页面显示时参与状态栏样式。
  const active = ref(true);

  watchImmediate(
    () => (active.value && toValue(enabled) ? toValue(dark) : undefined),
    (value) => {
      if (value === undefined) {
        headers.value.delete(id);
        return;
      }

      headers.value.set(id, value);
    },
  );

  onActivated(() => {
    active.value = true;
  });

  onDeactivated(() => {
    active.value = false;
  });

  onScopeDispose(() => headers.value.delete(id));
};
