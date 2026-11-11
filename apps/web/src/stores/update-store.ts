import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { getVersion } from '@tauri-apps/api/app';
import { check as checkUpdate, type Update } from '@tauri-apps/plugin-updater';
import { isDesktop } from '@/platform';
import { useStorage } from '@vueuse/core';
import { getProgress } from '../utils/player.ts';
import {
  UPDATE_ERROR_MESSAGE_MAP,
  UPDATE_STATUS_MESSAGE_MAP,
  type UpdateErrorType,
  type UpdateStatus,
} from '@/map';
import { errorToast, infoToast, storageError } from '@ym-video/ui/lib/toast';

// 更新任务与已下载资源由应用共享，设置弹窗关闭后继续保留。
export const useUpdateStore = defineStore('desktop-update', () => {
  // 自动检查更新的本地偏好。
  const autoUpdate = useStorage('ym-video:auto-update', false, undefined, {
    onError: () => storageError('本地设置'),
  });

  // 上次成功完成自动检查的时间戳。
  const lastCheck = useStorage('ym-video:last-update-check', 0, undefined, {
    onError: () => storageError('本地设置'),
  });

  // 当前安装的客户端版本。
  const version = ref('');

  // 更新服务返回的可用版本。
  const latestVersion = ref('');

  // 版本检查与下载的当前状态。
  const status = ref<UpdateStatus>('idle');

  // 检查或安装失败的类别决定对应提示。
  const errorType = ref<UpdateErrorType | null>(null);

  // 安装包已经下载的百分比。
  const progress = ref(0);

  // updater 持有的版本信息和已下载资源。
  let update: Update | null = null;

  // 应用更新任务是否已经初始化。
  let initialized = false;

  // 状态文案从集中映射读取，并填入版本和进度。
  const message = computed(() => {
    if (status.value === 'error') {
      return UPDATE_ERROR_MESSAGE_MAP[errorType.value ?? 'check'];
    }

    return UPDATE_STATUS_MESSAGE_MAP[status.value]
      .replace('{version}', latestVersion.value)
      .replace('{progress}', String(progress.value));
  });

  // 下载失败释放原生资源，下一次检查创建新的更新任务。
  const check = async () => {
    if (
      !isDesktop ||
      ['checking', 'downloading', 'downloaded', 'installing'].includes(
        status.value,
      )
    ) {
      return;
    }

    status.value = 'checking';
    errorType.value = null;

    progress.value = 0;

    try {
      await update?.close();

      update = await checkUpdate({ timeout: 10000 });

      if (!update) {
        status.value = 'up-to-date';

        return;
      }

      latestVersion.value = update.version;

      status.value = 'downloading';

      // 更新安装包的总字节数。
      let total = 0;

      // 本次下载已经接收的字节数。
      let received = 0;

      await update.download(
        (event) => {
          if (event.event === 'Started') {
            total = event.data.contentLength ?? 0;
          }

          if (event.event === 'Progress') {
            received += event.data.chunkLength;

            progress.value = Math.min(
              99,
              Math.floor(getProgress(received, total)),
            );
          }
        },
        { timeout: 60000 },
      );

      progress.value = 100;

      status.value = 'downloaded';

      infoToast('新版本已下载，安装后将重启应用', {
        duration: Infinity,
        action: { label: '现在安装', onClick: install },
      });
    } catch (cause) {
      errorType.value = cause instanceof TypeError ? 'network' : 'check';
      status.value = 'error';
    }
  };

  // Windows updater 启动已验证的安装包并重启应用。
  const install = async () => {
    if (!update || status.value !== 'downloaded') {
      return;
    }

    status.value = 'installing';

    try {
      await update.install({ restartAfterInstall: true });
    } catch {
      status.value = 'downloaded';
      errorType.value = 'install';
      errorToast(UPDATE_ERROR_MESSAGE_MAP.install);
    }
  };

  // 保存自动更新偏好，并在启用后检查更新。
  const setAutoUpdate = (enabled: boolean) => {
    autoUpdate.value = enabled;

    if (enabled) {
      check();
    }
  };

  // 应用启动时读取版本，每天最多执行一次自动检查。
  const init = () => {
    if (!isDesktop || initialized) {
      return () => {};
    }

    initialized = true;

    getVersion()
      .then((current) => {
        version.value = current;
      })
      .catch(() => errorToast('无法读取客户端版本'));

    if (autoUpdate.value && Date.now() - lastCheck.value >= 86400000) {
      check().then(() => {
        if (status.value !== 'error') {
          lastCheck.value = Date.now();
        }
      });
    }

    return () => {
      initialized = false;

      update?.close().catch(console.error);

      update = null;
    };
  };

  return {
    autoUpdate,
    version,
    status,
    progress,
    message,
    check,
    install,
    setAutoUpdate,
    init,
  };
});
