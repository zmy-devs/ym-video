<template>
  <div
    v-if="!fullscreen && !hidden"
    data-slot="window-controls"
    class="h-title-bar fixed top-0 right-0 z-70 flex"
  >
    <button
      type="button"
      class="w-12 flex items-center justify-center hover:bg-foreground/10 focus-visible:outline-2 focus-visible:-outline-offset-2"
      data-action="minimize"
      @click="handleMinimize"
    >
      <Minus class="size-4" />
    </button>
    <button
      type="button"
      class="w-12 flex items-center justify-center hover:bg-foreground/10 focus-visible:outline-2 focus-visible:-outline-offset-2"
      :data-action="maximized ? 'restore' : 'maximize'"
      @click="handleMaximize"
    >
      <Copy v-if="maximized" class="size-3 rotate-90" />
      <Square v-else class="size-3" />
    </button>
    <button
      type="button"
      class="w-12 flex items-center justify-center hover:bg-[#e81123] hover:text-white focus-visible:outline-2 focus-visible:-outline-offset-2"
      data-action="close"
      @click="handleClose"
    >
      <X class="size-4" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useEventListener } from '@vueuse/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Copy, Minus, Square, X } from 'lucide-vue-next';
import { errorToast } from '@ym-video/ui/lib/toast';

// 页面可隐藏窗口按钮，标题栏拖动监听持续生效。
defineProps<{ hidden?: boolean }>();

// 自制控件操作当前桌面窗口。
const appWindow = getCurrentWindow();

// 最大化图标与窗口实际状态保持一致。
const maximized = ref(false);

// 视频全屏时隐藏窗口控件。
const fullscreen = ref(Boolean(document.fullscreenElement));

// 卸载时释放窗口尺寸订阅。
let stopResize: (() => void) | undefined;

// 组件卸载后立即释放晚到的订阅。
let disposed = false;

// 最小化当前桌面窗口。
const handleMinimize = () =>
  appWindow.minimize().catch(() => errorToast('无法最小化窗口'));

// 切换最大化和还原状态。
const handleMaximize = () =>
  appWindow.toggleMaximize().catch(() => errorToast('无法调整窗口'));

// 关闭当前桌面窗口。
const handleClose = () =>
  appWindow.close().catch(() => errorToast('无法关闭窗口'));

// 读取系统快捷键和标题栏操作产生的窗口状态。
const syncMaximized = async () => {
  maximized.value = await appWindow.isMaximized();
};

// 标题栏空白处支持拖动，双击切换最大化。
const handleTitlebarDrag = (event: MouseEvent) => {
  const target = event.target;

  if (
    event.button !== 0 ||
    !(target instanceof Element) ||
    !target.closest('.desktop-title-bar, .login-title-bar') ||
    target.closest('button, a, input, select, textarea')
  ) {
    return;
  }

  if (event.detail === 2 && !target.closest('.login-title-bar')) {
    return handleMaximize();
  }

  return appWindow.startDragging().catch(() => errorToast('无法拖动窗口'));
};

useEventListener(document, 'mousedown', handleTitlebarDrag);

useEventListener(document, 'fullscreenchange', () => {
  fullscreen.value = Boolean(document.fullscreenElement);
});

onMounted(async () => {
  try {
    await syncMaximized();

    // 原生窗口尺寸变化时同步最大化图标。
    const stop = await appWindow.onResized(() => {
      syncMaximized().catch(console.error);
    });

    if (disposed) {
      stop();
    } else {
      stopResize = stop;
    }
  } catch {
    errorToast('无法读取窗口状态');
  }
});

onUnmounted(() => {
  disposed = true;
  stopResize?.();
});
</script>
