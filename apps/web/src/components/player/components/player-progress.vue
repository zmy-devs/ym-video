<template>
  <div class="flex flex-col gap-1">
    <div
      class="h-1.5 relative flex items-center"
      @pointermove="handlePreview"
      @pointerleave="hoverTime = undefined"
    >
      <input
        type="range"
        class="player-progress w-full h-1.5 block cursor-pointer appearance-none rounded-full shadow-[var(--player-shadow)] disabled:cursor-default focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-4"
        :style="{ '--progress': `${progressPercent}%` }"
        :value="currentTime"
        :max="duration || 1"
        min="0"
        step="1"
        :disabled="!duration"
        @input="handleSeek"
        @pointerdown="handleDragStart"
        @pointerup="handleDragEnd"
        @pointercancel="handleDragEnd"
        @lostpointercapture="handleDragEnd"
      />
      <div
        v-if="markerTime !== undefined && duration"
        data-slot="player-progress-preview"
        class="pointer-events-none w-0.5 h-4 absolute bg-white/80"
        :style="{ left: `${markerPercent}%` }"
      >
        <span
          class="absolute bottom-full left-1/2 -translate-x-1/2 whitespace-nowrap text-shadow-[0_1px_3px_#000]"
        >
          {{ formatTime(markerTime) }}
        </span>
      </div>
    </div>
    <div
      class="flex justify-between text-white/80 tabular-nums text-shadow-[0_1px_3px_#000]"
    >
      <span>{{ formatTime(currentTime) }}</span>
      <span>{{ formatTime(duration) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { getProgress, formatTime } from '../utils/time.ts';
import { usePlayerContext } from '../context.ts';
import { isMobile } from '@/platform';

// 进度条直接读取媒体时间、画面手势和拖动协调状态。
const { player, gestures, progress } = usePlayerContext();
const { currentTime, duration } = player;

// 移动端滑块先预览目标时间，松手后再更新真实进度。
const dragTime = ref<number>();

// 移动端滑块捕获指针，拖出进度条后仍能正确结束调整。
const handleDragStart = (event: PointerEvent) => {
  if (
    !isMobile ||
    event.button !== 0 ||
    !(event.currentTarget instanceof HTMLInputElement)
  ) {
    return;
  }

  event.currentTarget.setPointerCapture(event.pointerId);
  dragTime.value = currentTime.value;
  progress.dragging.value = true;
};

// 松手提交目标时间，取消则保留原进度，再交回播放状态控制。
const handleDragEnd = (event: PointerEvent) => {
  if (dragTime.value === undefined) {
    return;
  }

  if (event.type === 'pointerup') {
    player.seek(dragTime.value);
  }

  dragTime.value = undefined;
  progress.dragging.value = false;
};

// 进度填充始终反映真实播放位置，预览只移动时间刻度。
const progressPercent = computed(() =>
  getProgress(currentTime.value, duration.value),
);

// 鼠标悬停时预览的目标时间。
const hoverTime = ref<number>();

// 触摸手势与鼠标悬停共用进度条上的竖线和时间刻度。
const markerTime = computed(
  () => gestures.seekPreview.value ?? dragTime.value ?? hoverTime.value,
);

// 刻度位置随目标时间在整段媒体中的比例变化。
const markerPercent = computed(() =>
  getProgress(markerTime.value ?? 0, duration.value),
);

// 把指针位置转换为进度条上的有效比例。
const handlePreview = (event: PointerEvent) => {
  if (
    event.pointerType !== 'mouse' ||
    !(event.currentTarget instanceof HTMLElement)
  ) {
    return;
  }
  // 当前进度条在视口中的范围。
  const bounds = event.currentTarget.getBoundingClientRect();
  hoverTime.value =
    (duration.value * getProgress(event.clientX - bounds.left, bounds.width)) /
    100;
};

// 原生滑块同时支持鼠标拖动与键盘方向键。
const handleSeek = (event: Event) => {
  if (event.target instanceof HTMLInputElement) {
    if (dragTime.value !== undefined) {
      dragTime.value = event.target.valueAsNumber;
      event.target.value = String(currentTime.value);
      return;
    }

    return progress.seek(event.target.valueAsNumber);
  }
};
</script>

<style scoped>
.player-progress {
  background: linear-gradient(
    to right,
    var(--primary) var(--progress),
    var(--player-control) var(--progress)
  );

  &::-webkit-slider-thumb {
    width: 6px;
    height: 6px;
    appearance: none;
    border-radius: 50%;
    background: transparent;
  }

  &::-moz-range-thumb {
    width: 6px;
    height: 6px;
    border: 0;
    border-radius: 50%;
    background: transparent;
  }

  &::-moz-range-progress {
    background-color: var(--primary);
  }
}
</style>
