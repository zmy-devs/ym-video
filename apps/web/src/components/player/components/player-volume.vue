<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <PlayerButton :label="`音量：${percentage}%`">
        <component :is="volumeIcon" />
      </PlayerButton>
    </PopoverTrigger>
    <PopoverContent
      :portal-container="container"
      side="top"
      class="w-60 flex items-center gap-3"
    >
      <component :is="volumeIcon" class="size-4 shrink-0" />
      <Slider
        :model-value="[percentage]"
        :min="0"
        :max="100"
        :step="1"
        class="min-w-0 flex-1"
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
} from '@ym-video/ui/components/popover';
import { Slider } from '@ym-video/ui/components/slider';
import PlayerButton from './player-button.vue';
import { usePlayerContext } from '../context.ts';

// 音量浮窗直接共享媒体值与自身的打开状态。
const { player, controls } = usePlayerContext();
const { volume, container, setVolume } = player;
const { volumeOpen: open } = controls;

// 滑块和数值使用零到一百的整数百分比。
const percentage = computed(() => Math.round(volume.value * 100));

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
    setVolume(value / 100);
  }
};
</script>
