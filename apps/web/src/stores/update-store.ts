import { ref } from 'vue';
import { defineStore } from 'pinia';
import { getVersion } from '@tauri-apps/api/app';
import { isTauri } from '@tauri-apps/api/core';
import { isDesktop } from '@/platform';
import { useStorage } from '@vueuse/core';
import { checkClientUpdate } from '@/services/update';
import type { ClientUpdate, UpdateStatus } from '@/types/update';
import { errorToast, infoToast, storageError } from '@ym-video/ui/lib/toast';

// 更新任务与已下载资源由应用共享，设置弹窗关闭后继续保留。
export const useUpdateStore = defineStore('client-update', () => {
  // 自动检查更新的本地偏好。
  const autoUpdate = useStorage('ym-video:auto-update', false, undefined, {
    onError: () => storageError('本地设置'),
  });

  // 上次成功完成更新检查的时间戳。
  const lastCheck = useStorage('ym-video:last-update-check', 0, undefined, {
    onError: () => storageError('本地设置'),
  });

  // 当前安装的客户端版本。
  const version = ref('');

  // 版本检查与下载的当前状态。
  const status = ref<UpdateStatus>('idle');

  // 未提供下载总量时不展示百分比。
  const progress = ref<number | null>(null);

  // 当前平台持有的版本信息和已下载资源。
  let update: ClientUpdate | null = null;

  // 应用更新任务是否已经初始化。
  let initialized = false;

  // 下载资源由应用持有，失败或退出时统一释放。
  const closeUpdate = async () => {
    // 先移除本地引用，后续检查只使用新创建的更新任务。
    const current = update;

    update = null;

    await current?.close?.();
  };

  // 检查后自动下载对应平台安装包，安装由用户确认。
  const check = async () => {
    if (!isTauri() || status.value !== 'idle') {
      return;
    }

    status.value = 'checking';
    progress.value = null;

    try {
      update = await checkClientUpdate();

      if (!update) {
        status.value = 'idle';
        lastCheck.value = Date.now();
        infoToast('当前已是最新版本');

        return;
      }

      status.value = 'downloading';

      await update.download((value) => {
        progress.value = value;
      });

      progress.value = 100;

      status.value = 'downloaded';
      lastCheck.value = Date.now();

      infoToast(
        isDesktop
          ? '新版本已下载，安装后将重启应用'
          : '新版本已下载，请确认安装更新',
        {
          id: 'client-update-ready',
          duration: Infinity,
          action: { label: '现在安装', onClick: install },
        },
      );
    } catch (cause) {
      console.error('客户端更新失败', cause);
      await closeUpdate().catch(console.error);
      status.value = 'idle';
      errorToast('更新失败，请重试', { id: 'client-update-error' });
    }
  };

  // 平台安装器处理安装；Android 保留 APK，允许返回后再次打开。
  const install = async () => {
    if (!update || !['downloaded', 'installer-opened'].includes(status.value)) {
      return;
    }

    status.value = 'installing';

    try {
      if (!(await update.install())) {
        status.value = 'downloaded';
        errorToast('请允许安装未知应用，然后重试安装', {
          id: 'client-update-error',
        });

        return;
      }

      if (!isDesktop) {
        status.value = 'installer-opened';
      }
    } catch (cause) {
      status.value = 'downloaded';
      console.error('客户端更新安装失败', cause);
      errorToast('安装失败，请重试', {
        id: 'client-update-error',
      });
    }
  };

  // 保存自动更新偏好，并在启用后检查更新。
  const setAutoUpdate = async (enabled: boolean) => {
    autoUpdate.value = enabled;

    if (enabled) {
      await check();
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

    if (autoUpdate.value && Date.now() - lastCheck.value >= 86400000) {
      check().catch(console.error);
    }

    return () => {
      initialized = false;

      closeUpdate().catch(console.error);
    };
  };

  return {
    autoUpdate,
    version,
    status,
    progress,
    check,
    install,
    setAutoUpdate,
    init,
  };
});
