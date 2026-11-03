import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { getVersion } from '@tauri-apps/api/app';
import { check as checkUpdate, type Update } from '@tauri-apps/plugin-updater';
import { isTauri } from '@/lib/desktop';
import { readLocal, writeLocal } from '@/lib/storage';
import { errorToast, infoToast } from '@/utils/toast';

// 更新任务与已下载资源由应用共享，设置弹窗关闭后继续保留。
export const useUpdateStore = defineStore('desktop-update', () => {
  // 自动检查更新的本地偏好。
  const autoUpdate = ref(
    readLocal(
      'auto-update',
      false,
      (value): value is boolean => typeof value === 'boolean',
    ),
  );

  // 当前安装的客户端版本。
  const version = ref('');

  // 更新服务返回的可用版本。
  const latestVersion = ref('');

  // 版本检查与下载的当前状态。
  const status = ref<
    'idle' | 'checking' | 'up-to-date' | 'downloading' | 'downloaded' | 'error'
  >('idle');

  // 安装包已经下载的百分比。
  const progress = ref(0);

  // 安装请求是否正在执行。
  const installing = ref(false);

  // updater 持有的版本信息和已下载资源。
  let update: Update | null = null;

  // 应用更新任务是否已经初始化。
  let initialized = false;

  // 状态文案由版本检查和下载结果统一驱动。
  const message = computed(() => {
    switch (status.value) {
      case 'checking':
        return '正在检查更新…';
      case 'up-to-date':
        return '当前已是最新版本';
      case 'downloading':
        return '正在下载 v' + latestVersion.value + '，' + progress.value + '%';
      case 'downloaded':
        return 'v' + latestVersion.value + ' 已下载完成';
      case 'error':
        return '更新失败，请检查网络后重试';
      default:
        return '';
    }
  });

  // 下载失败释放原生资源，下一次检查创建新的更新任务。
  const check = async () => {
    if (
      !isTauri() ||
      installing.value ||
      ['checking', 'downloading', 'downloaded'].includes(status.value)
    ) {
      return;
    }

    status.value = 'checking';

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

            progress.value = total
              ? Math.min(99, Math.floor((received / total) * 100))
              : 0;
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
    } catch {
      status.value = 'error';
    }
  };

  // Windows updater 启动已验证的安装包并重启应用。
  const install = async () => {
    if (!update || status.value !== 'downloaded' || installing.value) {
      return;
    }

    installing.value = true;

    try {
      await update.install({ restartAfterInstall: true });
    } catch {
      installing.value = false;

      errorToast('安装失败，请重试');
    }
  };

  // 保存自动更新偏好，并在启用后检查更新。
  const setAutoUpdate = (enabled: boolean) => {
    autoUpdate.value = enabled;

    writeLocal('auto-update', enabled);

    if (enabled) {
      check();
    }
  };

  // 应用启动时读取版本，每天最多执行一次自动检查。
  const init = () => {
    if (!isTauri() || initialized) {
      return () => {};
    }

    initialized = true;

    getVersion()
      .then((current) => {
        version.value = current;
      })
      .catch(() => errorToast('无法读取客户端版本'));

    // 上次完成自动检查的时间戳。
    const lastCheck = readLocal(
      'last-update-check',
      0,
      (value): value is number =>
        typeof value === 'number' && Number.isFinite(value),
    );

    if (autoUpdate.value && Date.now() - lastCheck >= 86400000) {
      check().then(() => {
        if (status.value !== 'error') {
          writeLocal('last-update-check', Date.now());
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
    installing,
    message,
    check,
    install,
    setAutoUpdate,
    init,
  };
});
