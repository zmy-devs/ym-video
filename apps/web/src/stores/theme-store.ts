import { useThemePreferences } from '@ym-video/ui/composables/use-theme';
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useColorMode, watchImmediate } from '@vueuse/core';
import { isTauri } from '@/lib/desktop';
import { getCurrentWindow } from '@tauri-apps/api/window';

// 主题偏好保存在浏览器，VueUse 负责跟随系统和同步根节点主题类。
export const useThemeStore = defineStore('theme', () => {
  // 浏览器外观由共享 UI 包持久化。
  const { mode, color, setMode, setColor } = useThemePreferences();

  // 播放页固定暗色，仅影响当前窗口，不改写用户的主题偏好。
  const playerMode = ref(false);

  // VueUse 同时更新根节点与传送到 body 的弹层主题。
  const effectiveMode = computed(() =>
    playerMode.value ? 'dark' : mode.value,
  );

  // 页面主题由当前基础主题和播放器模式共同决定。
  const colorMode = useColorMode<'light' | 'dark'>({
    storageRef: effectiveMode,
  });

  // 自动模式下当前实际生效的明暗主题。
  const resolved = computed(() => colorMode.state.value);

  // 由根路由同步临时外观，离开播放页后恢复原主题。
  const setPlayerMode = (value: boolean) => {
    playerMode.value = value;
  };

  // 实际明暗主题决定浏览器工具栏颜色。
  watchImmediate(
    resolved,
    (nextTheme) => {
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', nextTheme === 'dark' ? '#0a0a0a' : '#fcfcfc');
    },
  );

  // 自动模式交回系统控制，避免窗口主题反过来固定 WebView 的媒体查询。
  watchImmediate(
    effectiveMode,
    (nextMode) => {
      if (isTauri()) {
        getCurrentWindow()
          .setTheme(nextMode === 'auto' ? null : nextMode)
          .catch(console.error);
      }
    },
  );

  return { mode, color, resolved, setMode, setColor, setPlayerMode };
});
