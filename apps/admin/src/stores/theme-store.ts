import { computed } from 'vue';
import { defineStore } from 'pinia';
import { useColorMode } from '@vueuse/core';
import { useThemePreferences } from '@ym-video/ui/composables/use-theme';

// 管理应用使用浏览器主题与共享外观偏好。
export const useThemeStore = defineStore('theme', () => {
  const preferences = useThemePreferences();
  const colorMode = useColorMode<'light' | 'dark'>({
    storageRef: preferences.mode,
  });
  const resolved = computed(() => colorMode.state.value);
  return { ...preferences, resolved };
});
