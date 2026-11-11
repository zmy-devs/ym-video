<template>
  <PlayerPage
    :player="player"
    :data-theme-color="theme.color"
    :brightness="brightness"
    :immersive="isMobile"
    :mobile="isMobile"
    :header-class="isDesktop ? 'desktop-title-bar pr-36' : undefined"
    @back="handleBack"
    @brightness="handleBrightness"
  />
</template>

<script setup lang="ts">
import { onMounted, onScopeDispose, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import PlayerPage from '../components/player/player-page.vue';
import { usePlayer } from '@/composables/use-player';
import { useThemeStore } from '@/stores/theme-store';
import { isDesktop, isMobile } from '@/platform';
import { platformCapabilities } from '@/platform-capabilities';

const player = usePlayer();
const theme = useThemeStore();
const router = useRouter();
const brightness = ref<number>();

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

onMounted(async () => {
  if (!isMobile) {
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
