<template>
  <Sheet v-if="isDesktop" v-model:open="open">
    <SheetContent
      side="bottom"
      data-player-sheet
      :show-overlay="false"
      :show-close-button="false"
      :aria-describedby="undefined"
      class="dark h-full w-full gap-0 border-0 p-0"
      @open-auto-focus="handleSheetFocus"
      @close-auto-focus="handleSheetClosed"
      @escape-key-down="handleSheetEscape"
    >
      <SheetTitle class="sr-only">播放器</SheetTitle>
      <PlayerPage
        :player="player"
        :data-theme-color="theme.color"
        header-class="desktop-title-bar"
        @back="open = false"
      />
    </SheetContent>
  </Sheet>
  <PlayerPage
    v-else
    :player="player"
    :data-theme-color="theme.color"
    :brightness="brightness"
    :immersive="isMobile"
    :mobile="isMobile"
    @back="handleBack"
    @brightness="handleBrightness"
  />
</template>

<script setup lang="ts">
import { onMounted, onScopeDispose, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Sheet, SheetContent, SheetTitle } from '@ym-video/ui/components/sheet';
import PlayerPage from '../components/player/player-page.vue';
import { usePlayer } from '@/composables/use-player';
import { useThemeStore } from '@/stores/theme-store';
import { isDesktop, isMobile } from '@/platform';
import { platformCapabilities } from '@/platform-capabilities';

const player = usePlayer();
const theme = useThemeStore();
const router = useRouter();
const brightness = ref<number>();

// PC 播放页挂载后展开底部 Sheet。
const open = ref(false);

// 外部导航离开播放器时不重复触发返回。
const route = useRoute();

// Sheet 关闭后把焦点交还给进入播放器前的控件。
const returnFocus = document.activeElement;

// 原生能力失败时保留播放器主体，只记录平台诊断信息。
const handleNativeError = (cause: unknown) =>
  console.error('播放器设备控制失败', cause);

// 移动端亮度手势通过统一平台能力接口更新当前窗口。
const handleBrightness = async (value: number) => {
  brightness.value = value;
  try {
    await platformCapabilities.setBrightness(value);
  } catch (cause) {
    handleNativeError(cause);
  }
};

// 返回进入播放器前的页面，直接打开时回到概览。
const handleBack = () => {
  if (router.options.history.state.back) {
    router.back();
    return;
  }
  return router.replace('/overview');
};

// 打开时聚焦视频区域，让播放器快捷键直接可用。
const handleSheetFocus = (event: Event) => {
  event.preventDefault();
  player.container.value?.focus({ preventScroll: true });
};

// 收起动画结束后离开播放路由。
const handleSheetClosed = (event: Event) => {
  event.preventDefault();

  if (returnFocus instanceof HTMLElement && returnFocus.isConnected) {
    returnFocus.focus({ preventScroll: true });
  }

  if (!open.value && route.name === 'player') {
    return handleBack();
  }
};

// 全屏状态先退出全屏，普通状态沿用 Sheet 的 Escape 关闭。
const handleSheetEscape = (event: KeyboardEvent) => {
  if (document.fullscreenElement) {
    event.preventDefault();
    return player.toggleFullscreen();
  }
};

// 收起时先暂停，让媒体在卸载前保存当前进度。
watch(open, (value, previous) => {
  if (previous && !value) {
    player.video.value?.pause();
  }
});

onMounted(async () => {
  if (isDesktop) {
    open.value = true;
    return;
  }

  try {
    brightness.value = await platformCapabilities.getBrightness();
    await Promise.all([
      platformCapabilities.setLandscape(true),
      platformCapabilities.setImmersive(true),
    ]);
  } catch (cause) {
    handleNativeError(cause);
  }
});

watch(
  player.status,
  (status) => {
    platformCapabilities
      .setKeepScreenOn(status === 'playing' || status === 'buffering')
      .catch(handleNativeError);
  },
  { immediate: true },
);

onScopeDispose(() => {
  if (!isMobile) {
    return;
  }
  platformCapabilities.setKeepScreenOn(false).catch(handleNativeError);
  platformCapabilities.resetBrightness().catch(handleNativeError);
  platformCapabilities.setLandscape(false).catch(handleNativeError);
  platformCapabilities.setImmersive(false).catch(handleNativeError);
});
</script>
