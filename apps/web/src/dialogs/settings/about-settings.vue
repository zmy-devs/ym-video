<template>
  <section class="flex flex-col gap-8">
    <div v-if="desktopIpc">
      <h2 class="border-b px-4 py-3 text-sm">桌面应用</h2>
      <div class="min-h-17.5 flex items-center gap-6 px-4 py-3 text-sm">
        <div class="min-w-0 flex-1 space-y-1">
          <h3 class="font-medium">应用版本</h3>
          <p class="text-muted-foreground">
            {{ appVersion ? `当前版本 v${appVersion}` : '正在读取版本…' }}
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <Button
            v-if="updateStatus === 'downloaded'"
            size="sm"
            :disabled="installing"
            @click="handleInstallUpdate"
          >
            {{ installing ? '正在重启…' : '重启并安装' }}
          </Button>
          <Button
            v-else
            size="sm"
            variant="outline"
            :disabled="checking || updateStatus === 'downloading'"
            @click="handleCheckUpdate"
          >
            {{ checking ? '检查中…' : '检查更新' }}
          </Button>
        </div>
      </div>
      <div v-if="updateMessage" class="space-y-2 px-4 pb-3 text-sm">
        <p role="status" class="text-muted-foreground">{{ updateMessage }}</p>
        <Progress
          v-if="updateStatus === 'downloading'"
          :model-value="downloadProgress"
          :aria-label="`下载更新 ${downloadProgress}%`"
          class="h-1"
        />
      </div>
    </div>
    <div>
      <h2 class="border-b px-4 py-3 text-sm">关于</h2>
      <div class="min-h-17.5 flex items-center gap-2.5 px-4 py-3 text-sm">
        <div class="min-w-0 flex-1 space-y-1">
          <h3 class="font-medium">反馈问题</h3>
          <p class="text-muted-foreground">反馈应用存在的 bug</p>
        </div>
        <Button as-child size="sm" variant="outline">
          <a
            href="https://github.com/2514765066/ym-video/issues"
            target="_blank"
            rel="noopener noreferrer"
            >反馈</a
          >
        </Button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

// 桌面 preload 注入的 IPC 桥接，浏览器中不存在
const desktopIpc = typeof window === 'undefined' ? undefined : window.ipc;
// 桌面应用当前版本
const appVersion = ref('');
// 是否正在检查更新
const checking = ref(false);
// 是否正在安装更新
const installing = ref(false);
// 安装包下载进度
const downloadProgress = ref(0);
// 桌面应用更新状态
const updateStatus = ref<
  'idle' | 'downloading' | 'downloaded' | 'up-to-date' | 'error'
>('idle');
// 更新操作的状态提示
const updateMessage = ref('');
// 桌面更新事件的取消订阅函数
const unsubscribe = ref<Array<() => void>>([]);

// 订阅更新事件并读取桌面版本
onMounted(() => {
  if (!desktopIpc) {
    return;
  }

  unsubscribe.value = [
    desktopIpc.on('update-progress', (percent) => {
      downloadProgress.value = Math.max(0, Math.min(100, Math.floor(percent)));
      updateStatus.value = 'downloading';
      updateMessage.value = `正在下载更新 ${downloadProgress.value}%`;
    }),
    desktopIpc.on('update-downloaded', (version) => {
      downloadProgress.value = 100;
      updateStatus.value = 'downloaded';
      updateMessage.value = `v${version} 已下载完成`;
    }),
    desktopIpc.on('update-error', () => {
      checking.value = false;
      updateStatus.value = 'error';
      updateMessage.value = '更新失败，请检查网络后重试';
    }),
  ];

  void desktopIpc
    .getVersion()
    .then((version) => {
      appVersion.value = version;
    })
    .catch(() => {
      updateMessage.value = '无法读取桌面应用版本';
    });
});

// 页面离开时取消更新事件订阅
onUnmounted(() => {
  for (const unsubscribeEvent of unsubscribe.value) {
    unsubscribeEvent();
  }
});

// 检查桌面应用更新
const handleCheckUpdate = async () => {
  if (!desktopIpc || checking.value) {
    return;
  }

  checking.value = true;
  updateStatus.value = 'idle';
  updateMessage.value = '';
  downloadProgress.value = 0;

  try {
    const result = await desktopIpc.checkForUpdates();
    if (updateStatus.value !== 'idle') {
      return;
    }

    if (result.status === 'up-to-date') {
      updateStatus.value = 'up-to-date';
      updateMessage.value = '当前已是最新版本';
    } else if (result.status === 'downloaded') {
      updateStatus.value = 'downloaded';
      updateMessage.value = `v${result.version} 已下载完成`;
    } else {
      updateStatus.value = 'downloading';
      updateMessage.value = `发现新版本 v${result.version}，正在下载`;
    }
  } catch {
    updateStatus.value = 'error';
    updateMessage.value = '检查更新失败，请检查网络后重试';
  } finally {
    checking.value = false;
  }
};

// 安装已下载的桌面更新
const handleInstallUpdate = async () => {
  if (!desktopIpc || installing.value) {
    return;
  }

  installing.value = true;
  try {
    await desktopIpc.installUpdate();
  } catch {
    installing.value = false;
    updateStatus.value = 'error';
    updateMessage.value = '安装失败，请重新检查更新';
  }
};
</script>
