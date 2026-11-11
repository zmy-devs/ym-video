import { watch } from 'vue';
import { useStorage } from '@vueuse/core';
import { storageError } from '@ym-video/ui/lib/toast';

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
export const isThemeMode = (
  value: unknown,
): value is 'auto' | 'light' | 'dark' =>
  value === 'auto' || value === 'light' || value === 'dark';

// 存储和界面输入均限制在已定义的主题色内。
export const isThemeColor = (
  value: unknown,
): value is keyof typeof themeColors =>
  typeof value === 'string' && Object.hasOwn(themeColors, value);

// 界面主题的可选模式和强调色。
export type ThemeMode = 'auto' | 'light' | 'dark';
export type ThemeColor = keyof typeof themeColors;

// 两个浏览器应用共用主题偏好和根节点强调色。
export const useThemePreferences = () => {
  // 用户选择的基础主题，默认跟随系统。
  const mode = useStorage<'auto' | 'light' | 'dark'>(
    'ym-video:theme-mode',
    'auto',
    undefined,
    {
      onError: () => storageError('本地设置'),
      serializer: {
        read: (raw) => {
          const value: unknown = JSON.parse(raw);
          return isThemeMode(value) ? value : 'auto';
        },
        write: JSON.stringify,
      },
    },
  );

  // 用户选择的控件强调色。
  const color = useStorage<keyof typeof themeColors>(
    'ym-video:theme-color',
    'default',
    undefined,
    {
      onError: () => storageError('本地设置'),
      serializer: {
        read: (raw) => {
          const value: unknown = JSON.parse(raw);
          return isThemeColor(value) ? value : 'default';
        },
        write: JSON.stringify,
      },
    },
  );

  // 控件输入已在选择器边界收窄。
  const setMode = (value: ThemeMode) => {
    mode.value = value;
  };
  const setColor = (value: ThemeColor) => {
    color.value = value;
  };

  watch(
    color,
    (value) => {
      document.documentElement.dataset.themeColor = value;
    },
    { immediate: true },
  );

  return { mode, color, setMode, setColor };
};
