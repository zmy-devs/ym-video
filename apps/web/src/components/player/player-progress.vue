<template>
  <div class="flex flex-col gap-1 pb-2">
    <div
      class="h-1.5 relative flex items-center"
      @pointermove="handlePreview"
      @pointerleave="previewVisible = false"
    >
      <input
        type="range"
        class="player-progress w-full h-1.5 block rounded-full"
        :style="{ '--progress': `${progressPercent}%` }"
        :value="currentTime"
        :max="duration || 1"
        min="0"
        step="1"
        :disabled="!duration"
        aria-label="播放进度"
        :aria-valuetext="`${formatTime(currentTime)}，总时长 ${formatTime(duration)}`"
        @input="handleSeek"
      />
      <div
        v-if="previewVisible && duration"
        class="pointer-events-none w-0.5 h-4 absolute bg-white/80"
        :style="{ left: `${previewPercent}%` }"
        aria-hidden="true"
      >
        <span
          class="player-time absolute bottom-full left-1/2 -translate-x-1/2 whitespace-nowrap"
        >
          {{ formatTime((duration * previewPercent) / 100) }}
        </span>
      </div>
    </div>
    <div class="player-time flex justify-between text-white/80 tabular-nums">
      <span>{{ formatTime(currentTime) }}</span>
      <span>{{ formatTime(duration) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { formatTime } from '@/lib/movie';

// 当前媒体的真实进度与有效时长。
const props = defineProps<{ currentTime: number; duration: number }>();

// 鼠标拖动和键盘跳转统一交给播放器。
const emit = defineEmits<{ seek: [seconds: number] }>();

// 进度条中的已播放比例。
const progressPercent = computed(() =>
  props.duration
    ? Math.min(100, Math.max(0, (props.currentTime / props.duration) * 100))
    : 0,
);

// 鼠标预览的位置按百分比保存。
const previewPercent = ref(0);

// 仅鼠标停在进度条上时展示时间刻度。
const previewVisible = ref(false);

// 把指针位置转换为进度条上的有效比例。
const handlePreview = (event: PointerEvent) => {
  if (!(event.currentTarget instanceof HTMLElement)) {
    return;
  }
  // 当前进度条在视口中的范围。
  const bounds = event.currentTarget.getBoundingClientRect();
  previewPercent.value = Math.max(
    0,
    Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100),
  );
  previewVisible.value = true;
};

// 原生滑块同时支持鼠标拖动与键盘方向键。
const handleSeek = (event: Event) => {
  if (event.target instanceof HTMLInputElement) {
    emit('seek', event.target.valueAsNumber);
  }
};
</script>

<style scoped>
.player-progress {
  appearance: none;
  color-scheme: dark;
  cursor: pointer;
  background: linear-gradient(
    to right,
    rgb(255 255 255 / 80%) var(--progress),
    var(--player-control) var(--progress)
  );
  box-shadow: var(--player-shadow);
}

.player-progress:disabled {
  cursor: default;
}

.player-progress::-webkit-slider-thumb {
  width: 6px;
  height: 6px;
  appearance: none;
  border-radius: 50%;
  background: transparent;
}

.player-progress::-moz-range-thumb {
  width: 6px;
  height: 6px;
  border: 0;
  border-radius: 50%;
  background: transparent;
}

.player-progress:focus-visible {
  outline: 2px solid white;
  outline-offset: 4px;
}

.player-time {
  text-shadow: 0 1px 3px #000;
}
</style>
