import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { useColorMode } from '@vueuse/core';
import { readLocal, writeLocal } from '@/lib/storage';

// 主题色沿用 ym-printer 的 Tailwind 色板。
export const themeColors = {
  default: { label: '默认', color: 'var(--theme-color-default)' },
  blue: { label: '蓝色', color: 'var(--color-blue-600)' },
  green: { label: '绿色', color: 'var(--color-green-600)' },
  yellow: { label: '黄色', color: 'var(--color-yellow-500)' },
  orange: { label: '橙色', color: 'var(--color-orange-600)' },
  pink: { label: '粉色', color: 'var(--color-pink-600)' },
  purple: { label: '紫色', color: 'var(--color-purple-600)' },
};

// 只接受应用提供的明暗模式。
const isThemeMode = (value: unknown): value is 'auto' | 'light' | 'dark' =>
  value === 'auto' || value === 'light' || value === 'dark';

// 存储和界面输入均限制在已定义的主题色内。
const isThemeColor = (value: unknown): value is keyof typeof themeColors =>
  typeof value === 'string' && Object.hasOwn(themeColors, value);

// 主题偏好保存在浏览器，VueUse 负责跟随系统和同步根节点主题类。
export const useThemeStore = defineStore('theme', () => {
  // 用户选择的基础主题，默认跟随系统。
  const mode = ref(readLocal('theme-mode', 'auto', isThemeMode));

  // 用户选择的控件强调色。
  const color = ref(readLocal('theme-color', 'default', isThemeColor));

  // 使用已有存储边界，避免绕过浏览器存储失败提示。
  const colorMode = useColorMode<'light' | 'dark'>({ storageRef: mode });

  // 自动模式下当前实际生效的明暗主题。
  const resolved = computed(() => colorMode.state.value);

  // 切换并保存基础主题。
  const setMode = (value: unknown) => {
    if (!isThemeMode(value)) {
      return false;
    }
    mode.value = value;
    return writeLocal('theme-mode', value);
  };

  // 切换并保存强调色。
  const setColor = (value: unknown) => {
    if (!isThemeColor(value)) {
      return false;
    }
    color.value = value;
    return writeLocal('theme-color', value);
  };

  watch(
    color,
    (value) => {
      document.documentElement.dataset.themeColor = value;
    },
    { immediate: true },
  );

  // 恢复偏好、切换主题及系统明暗变化时同步浏览器和桌面壳。
  watch(
    [mode, resolved],
    ([nextMode, nextTheme]) => {
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', nextTheme === 'dark' ? '#0a0a0a' : '#fcfcfc');

      window.ipc?.toggleTheme?.(nextMode, nextTheme).catch(console.error);
    },
    { immediate: true },
  );

  return { mode, color, resolved, setMode, setColor };
});
