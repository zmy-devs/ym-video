<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <PlayerButton :label="`音量：${percentage}%`" :container="container">
        <component :is="volumeIcon" />
      </PlayerButton>
    </PopoverTrigger>
    <PopoverContent
      :portal-container="container"
      side="top"
      class="w-60 flex items-center gap-3"
      aria-label="调节音量"
    >
      <component :is="volumeIcon" class="size-4 shrink-0" aria-hidden="true" />
      <Slider
        :model-value="[percentage]"
        :min="0"
        :max="100"
        :step="1"
        class="min-w-0 flex-1"
        thumb-label="音量"
        @update:model-value="handleVolumeChange"
      />
      <span class="w-6 shrink-0 text-right text-xs tabular-nums">
        {{ percentage }}
      </span>
    </PopoverContent>
  </Popover>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Volume1, Volume2, VolumeX } from 'lucide-vue-next';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import PlayerButton from './player-button.vue';

// 音量沿用播放器的零到一数值，浮窗挂载到播放器容器。
const props = defineProps<{ volume: number; container: HTMLElement | null }>();

// 通知控制栏浮窗状态，避免全屏操作时自动隐藏。
const open = defineModel<boolean>('open', { required: true });

// 所有音量变更继续交给播放器保存并应用到媒体元素。
const emit = defineEmits<{ volume: [value: number] }>();

// 滑块和数值使用零到一百的整数百分比。
const percentage = computed(() => Math.round(props.volume * 100));

// 按静音、低音量和高音量切换按钮与浮窗中的图标。
const volumeIcon = computed(() => {
  if (percentage.value === 0) {
    return VolumeX;
  }

  if (percentage.value < 50) {
    return Volume1;
  }

  return Volume2;
});

// 将滑块数值转回播放器使用的音量比例。
const handleVolumeChange = (values: number[] | undefined) => {
  // 单个滑块对应的有效百分比。
  const value = values?.[0];

  if (value !== undefined) {
    emit('volume', value / 100);
  }
};
</script>
