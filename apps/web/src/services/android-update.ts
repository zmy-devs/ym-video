import { getVersion } from '@tauri-apps/api/app';
import { invoke } from '@tauri-apps/api/core';
import { appCacheDir, join } from '@tauri-apps/api/path';
import { download } from '@tauri-apps/plugin-upload';
import {
  canInstall,
  install,
  requestInstallPermission,
} from 'tauri-plugin-android-installer-api';
import type { AndroidUpdateManifest, ClientUpdate } from '@/types/update';

// 检查独立的 Android 更新清单，下载与安装由插件完成。
export const checkAndroidUpdate = async (): Promise<ClientUpdate | null> => {
  // 原生请求读取自有发布脚本生成的清单。
  const manifest = await invoke<AndroidUpdateManifest>(
    'android_update_manifest',
  );

  // 当前安装版本的主版本、次版本和修订号。
  const current = (await getVersion()).split('.').map(Number);

  // 发布版本的主版本、次版本和修订号。
  const latest = manifest.version.split('.').map(Number);

  // 第一个不同的版本段决定是否升级。
  const difference = latest.findIndex((part, index) => part !== current[index]);

  if (difference === -1 || latest[difference] <= current[difference]) {
    return null;
  }

  // 单个缓存文件由每次下载覆盖，只有完整下载后才允许安装。
  const path = await join(await appCacheDir(), 'ym-video-update.apk');

  return {
    version: manifest.version,
    download: async (onProgress) => {
      await download(manifest.url, path, ({ progressTotal, total }) => {
        onProgress(
          total > 0
            ? Math.min(99, Math.floor((progressTotal / total) * 100))
            : null,
        );
      });
    },
    install: async () => {
      if (!(await canInstall())) {
        await requestInstallPermission();

        if (!(await canInstall())) {
          return false;
        }
      }

      await install(path);

      return true;
    },
  };
};
