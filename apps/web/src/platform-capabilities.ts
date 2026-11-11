import { invoke, isTauri } from '@tauri-apps/api/core';
import { isMobile } from '@/platform';

const unsupported = () => {
  throw new Error('当前平台不支持此能力');
};

// 集中封装移动端设备能力，桌面端不会加载 Android 插件命令。
export const platformCapabilities = {
  // 状态栏图标在暗色外观下显示白色，浏览器预览只更新页面样式。
  setStatusBarStyle: async (dark: boolean) => {
    if (!isMobile || !isTauri()) {
      return;
    }

    await invoke('plugin:mobile-controls|set_status_bar_style', { dark });
  },
  getBrightness: async () => {
    if (!isMobile) {
      return undefined;
    }
    return invoke<number>('plugin:mobile-controls|get_brightness');
  },
  setBrightness: async (value: number) => {
    if (!isMobile) {
      return unsupported();
    }
    await invoke('plugin:mobile-controls|set_brightness', {
      brightness: value,
    });
  },
  setLandscape: async (enabled: boolean) => {
    if (!isMobile) {
      return;
    }
    await invoke('plugin:mobile-controls|set_landscape', { enabled });
  },
  setImmersive: async (enabled: boolean) => {
    if (!isMobile) {
      return;
    }
    await invoke('plugin:mobile-controls|set_immersive', { enabled });
  },
  setKeepScreenOn: async (enabled: boolean) => {
    if (!isMobile) {
      return;
    }
    await invoke('plugin:mobile-controls|set_keep_screen_on', { enabled });
  },
  resetBrightness: async () => {
    if (!isMobile) {
      return;
    }
    await invoke('plugin:mobile-controls|reset_brightness');
  },
};
