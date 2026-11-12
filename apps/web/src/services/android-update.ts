import { getVersion } from '@tauri-apps/api/app';
import { invoke } from '@tauri-apps/api/core';
import { appCacheDir, join } from '@tauri-apps/api/path';
import { download } from '@tauri-apps/plugin-upload';
import {
  canInstall,
  install,
  requestInstallPermission,
} from 'tauri-plugin-android-installer-api';
import { z } from 'zod';
import type { ClientUpdate } from '@/types/update';

// 清单校验稳定版本、Gitee 与本机测试的对应版本 APK 直链。
const manifestSchema = z
  .object({
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    notes: z.string(),
    url: z.url(),
  })
  .refine(
    ({ version, url }) =>
      url ===
        `https://gitee.com/zmy-devs/ym-video/releases/download/v${version}/ym-video-${version}-android-arm64.apk` ||
      url === `http://127.0.0.1:18789/ym-video-${version}-android-arm64.apk`,
    'Android 更新下载地址无效',
  );

// 检查独立的 Android 更新清单，下载与安装由插件完成。
export const checkAndroidUpdate = async (): Promise<ClientUpdate | null> => {
  // 原生请求跟随附件重定向，清单在进入业务前只校验一次。
  const payload = await invoke<unknown>('android_update_manifest').catch(
    (cause: unknown) => {
      if (
        typeof cause === 'object' &&
        cause !== null &&
        'message' in cause &&
        typeof cause.message === 'string'
      ) {
        throw new Error(cause.message);
      }

      throw cause;
    },
  );

  // 无效清单给出发布配置提示，保留入口单次校验。
  const parsed = manifestSchema.safeParse(payload);

  if (!parsed.success) {
    throw new Error('Android 更新清单格式错误，请联系发布者');
  }

  // 后续下载与安装只使用已验证的清单。
  const manifest = parsed.data;

  // 当前安装版本的主版本、次版本和修订号。
  const current = (await getVersion()).split('.').map(Number);

  // 发布清单已经验证为三段稳定版本。
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
    body: manifest.notes,
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
