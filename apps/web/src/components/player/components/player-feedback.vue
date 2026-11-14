<template>
  <p
    v-if="
      !seeking &&
      (gestureLabel || holdingRate || adjustingVolume || volumeVisible)
    "
    class="absolute top-4 left-1/2 z-20 -translate-x-1/2 rounded-xl bg-popover px-4 py-2 text-sm text-popover-foreground"
  >
    <template v-if="gestureLabel">{{ gestureLabel }}</template>
    <template v-else-if="holdingRate">{{ rate }} 倍速播放中…</template>
    <template v-else>音量：{{ Math.round(volume * 100) }}%</template>
  </p>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { useTimeoutFn } from '@vueuse/core';
import { usePlayerContext } from '../context.ts';
import { isMobile } from '@/platform';

// 媒体值和手势提示使用当前播放器上下文。
const { player, controls, gestures, progress, holdingRate } =
  usePlayerContext();
const { rate, volume } = player;
const { gestureLabel, adjustingVolume } = gestures;
const { seeking } = progress;

// 桌面音量快捷键的提示随组件卸载自动清理。
const {
  isPending: volumeVisible,
  start,
  stop,
} = useTimeoutFn(() => {}, 1000, { immediate: false });

watch(volume, () => {
  stop();
  if (!isMobile && !controls.menuOpen.value) {
    start();
  }
});
</script>
