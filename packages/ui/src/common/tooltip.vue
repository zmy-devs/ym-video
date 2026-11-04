<template>
  <Tooltip :disabled="!label" :delay-duration="delayDuration">
    <TooltipTrigger as-child>
      <slot />
    </TooltipTrigger>
    <TooltipContent
      :side="side"
      :align="align"
      :show-arrow="false"
      :portal-container="container"
      class="flex items-center gap-2 whitespace-pre-line"
    >
      {{ label }}
      <Kbd v-if="shortcut">{{ shortcut }}</Kbd>
    </TooltipContent>
  </Tooltip>
</template>

<script setup lang="ts">
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ym-video/ui/components/tooltip';
import { Kbd } from '@ym-video/ui/components/kbd';

// 侧栏等入口共用无箭头提示，方向默认朝右。
withDefaults(
  defineProps<{
    label: string;
    shortcut?: string;
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
    container?: HTMLElement | null;
    delayDuration?: number;
  }>(),
  { side: 'right', delayDuration: 300 },
);
</script>
