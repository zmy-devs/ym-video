<template>
  <DropdownMenu v-model:open="open">
    <DropdownMenuTrigger as-child>
      <PlayerButton
        :label="`播放速度：${formatRate(props.rate)}x`"
        :container="props.container"
      >
        <Gauge />
      </PlayerButton>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      :portal-container="props.container"
      side="top"
      align="center"
      class="w-35"
    >
      <DropdownMenuLabel class="text-xs text-muted-foreground">
        倍速
      </DropdownMenuLabel>
      <DropdownMenuItem
        v-for="speed in speeds"
        :key="speed"
        @select="emit('rate', speed)"
      >
        <span>{{ formatRate(speed) }}x</span>
        <Check v-if="speed === rate" class="ml-auto text-current" />
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Check, Gauge } from 'lucide-vue-next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@ym-video/ui/components/dropdown-menu';
import PlayerButton from './player-button.vue';

// 全部可选倍速，常用倍速靠近列表底部。
const speeds = [4, 3, 2, 1, 0.75, 0.5, 0.25];

// 菜单状态供外层控制栏管理自动隐藏。
const open = defineModel<boolean>('open', { required: true });

// 当前倍速与播放器内部弹层挂载位置。
const props = defineProps<{ rate: number; container: HTMLElement | null }>();

// 用户选择的新倍速。
const emit = defineEmits<{ rate: [speed: number] }>();

// 整数倍速补一位小数，其余选项保留原有精度。
const formatRate = (speed: number) =>
  Number.isInteger(speed) ? speed.toFixed(1) : String(speed);
</script>
