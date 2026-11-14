import { check } from '@tauri-apps/plugin-updater';
import { isDesktop } from '@/platform';
import { checkAndroidUpdate } from './android-update';
import type { ClientUpdate } from '@/types/update';

// 保持平台更新协议独立，设置页和任务状态共用同一套操作。
export const checkClientUpdate = async (): Promise<ClientUpdate | null> => {
  if (!isDesktop) {
    return checkAndroidUpdate();
  }

  // Windows 使用官方 updater 验证签名并保留安装资源。
  const update = await check({ timeout: 10000 });

  if (!update) {
    return null;
  }

  return {
    version: update.version,
    download: async (onProgress) => {
      // updater 逐块报告接收量，转换为设置页的百分比。
      let total = 0;

      // 下载进度累计接收量。
      let received = 0;

      await update.download(
        (event) => {
          if (event.event === 'Started') {
            total = event.data.contentLength ?? 0;
          }

          if (event.event === 'Progress') {
            received += event.data.chunkLength;
            onProgress(
              total > 0
                ? Math.min(99, Math.floor((received / total) * 100))
                : null,
            );
          }
        },
        { timeout: 300000 },
      );
    },
    install: async () => {
      await update.install({ restartAfterInstall: true });

      return true;
    },
    close: () => update.close(),
  };
};
