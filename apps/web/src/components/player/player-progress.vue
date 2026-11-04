<template>
  <div class="flex flex-col gap-1 pb-2">
    <div
      class="h-1.5 relative flex items-center"
      @pointermove="handlePreview"
      @pointerleave="previewVisible = false"
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
      />
      <div
        v-if="previewVisible && duration"
        class="pointer-events-none w-0.5 h-4 absolute bg-white/80"
        :style="{ left: `${previewPercent}%` }"
      >
        <span
          class="absolute bottom-full left-1/2 -translate-x-1/2 whitespace-nowrap text-shadow-[0_1px_3px_#000]"
        >
          {{ formatTime((duration * previewPercent) / 100) }}
        </span>
      </div>
    </div>
    <div class="flex justify-between text-white/80 tabular-nums text-shadow-[0_1px_3px_#000]">
      <span>{{ formatTime(currentTime) }}</span>
      <span>{{ formatTime(duration) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { getProgress } from '@/utils/progress';
import { formatTime } from '@/lib/movie';

// 当前媒体的真实进度与有效时长。
const props = defineProps<{ currentTime: number; duration: number }>();

// 鼠标拖动和键盘跳转统一交给播放器。
const emit = defineEmits<{ seek: [seconds: number] }>();

// 进度条中的已播放比例。
const progressPercent = computed(() =>
  getProgress(props.currentTime, props.duration),
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
  previewPercent.value = getProgress(event.clientX - bounds.left, bounds.width);
  previewVisible.value = true;
};

// 原生滑块同时支持鼠标拖动与键盘方向键。
const handleSeek = (event: Event) => {
  if (event.target instanceof HTMLInputElement) {
    emit('seek', event.target.valueAsNumber);
  }
};
</script>

<style scoped lang="scss">
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
