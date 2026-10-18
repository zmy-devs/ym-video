<template>
  <Tooltip :disabled="!label" :delay-duration="300">
    <TooltipTrigger as-child>
      <slot />
    </TooltipTrigger>
    <TooltipContent
      :side="side"
      :show-arrow="false"
      :class="
        shortcut ? 'flex items-center gap-2 whitespace-nowrap' : 'max-w-72'
      "
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
} from '@/components/ui/tooltip';
import { Kbd } from '@/components/ui/kbd';

// 侧栏等入口共用无箭头提示，方向默认朝右。
withDefaults(
  defineProps<{
    label: string;
    shortcut?: string;
    side?: 'top' | 'right' | 'bottom' | 'left';
  }>(),
  { side: 'right' },
);
</script>
