import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { readLocal, writeLocal } from '@/lib/storage';
import { errorToast, infoToast } from '@/utils/toast';

// 更新任务在应用内共享，切换设置分类不会丢失下载状态。
export const useUpdateStore = defineStore('desktop-update', () => {
  // 桌面桥接在浏览器中不存在。
  const ipc = window.ipc;

  // 自动检查偏好与参考项目一致，默认关闭。
  const autoUpdate = ref(
    readLocal(
      'auto-update',
      false,
      (value): value is boolean => typeof value === 'boolean',
    ),
  );

  // 当前安装版本及检测到的更新版本。
  const version = ref('');
  const latestVersion = ref('');

  // 更新任务状态及下载百分比。
  const status = ref<
    'idle' | 'checking' | 'up-to-date' | 'downloading' | 'downloaded' | 'error'
  >('idle');
  const progress = ref(0);
  const installing = ref(false);

  // 所有界面共享同一套状态文案。
  const message = computed(() => {
    switch (status.value) {
      case 'checking':
        return '正在检查更新…';
      case 'up-to-date':
        return '当前已是最新版本';
      case 'downloading':
        return `正在下载 v${latestVersion.value}，${progress.value}%`;
      case 'downloaded':
        return `v${latestVersion.value} 已下载完成`;
      case 'error':
        return '更新失败，请检查网络后重试';
      default:
        return '';
    }
  });

  // 手动检查始终可重试，正在进行的下载不重复启动。
  const check = async () => {
    if (
      !ipc ||
      installing.value ||
      ['checking', 'downloading', 'downloaded'].includes(status.value)
    ) {
      return;
    }

    status.value = 'checking';
    progress.value = 0;

    try {
      const result = await ipc.checkForUpdates();

      latestVersion.value = result || '';

      // 下载事件可能早于检查调用返回，保留事件给出的新状态。
      if (status.value !== 'checking') {
        return;
      }

      status.value = result ? 'downloading' : 'up-to-date';
    } catch {
      status.value = 'error';
    }
  };

  // 只安装已下载的更新，安装失败后仍可重试。
  const install = async () => {
    if (!ipc || status.value !== 'downloaded' || installing.value) {
      return;
    }

    installing.value = true;

    try {
      await ipc.installUpdate();
    } catch {
      installing.value = false;
      errorToast('安装失败，请重试');
    }
  };

  // 开启后立即检查，并保存客户端更新偏好。
  const setAutoUpdate = (enabled: boolean) => {
    autoUpdate.value = enabled;
    writeLocal('auto-update', enabled);

    if (enabled) {
      check();
    }
  };

  // 应用启动时订阅 IPC；回调首参是 Electron 事件对象。
  const init = () => {
    if (!ipc) {
      return () => {};
    }

    const unsubscribe = [
      ipc.on('update-progress', (_, percent) => {
        progress.value = Math.max(0, Math.min(100, Math.floor(percent)));
        status.value = 'downloading';
      }),
      ipc.on('update-downloaded', () => {
        progress.value = 100;
        status.value = 'downloaded';
        infoToast('新版本已下载，安装后将重启应用', {
          duration: Infinity,
          action: { label: '现在安装', onClick: install },
        });
      }),
      ipc.on('update-error', () => {
        status.value = 'error';
      }),
    ];

    ipc
      .getVersion()
      .then((currentVersion) => {
        version.value = currentVersion;
      })
      .catch(() => errorToast('无法读取客户端版本'));

    // 每次应用启动最多自动检查一次，失败不占用下一次启动的机会。
    const lastCheck = readLocal(
      'last-update-check',
      0,
      (value): value is number =>
        typeof value === 'number' && Number.isFinite(value),
    );

    if (autoUpdate.value && Date.now() - lastCheck >= 86_400_000) {
      check().then(() => {
        if (status.value !== 'error') {
          writeLocal('last-update-check', Date.now());
        }
      });
    }

    return () => unsubscribe.forEach((stop) => stop());
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
