<template>
  <Sheet v-if="mobile" v-model:open="open">
    <SheetTrigger as-child>
      <PlayerButton
        :label="`播放速度：${formatRate(rate)}x`"
        :container="container"
      >
        <Gauge />
      </PlayerButton>
    </SheetTrigger>
    <SheetContent
      :portal-container="container"
      :show-close-button="false"
      class="w-64 gap-0 data-[state=open]:duration-300"
      :aria-describedby="undefined"
    >
      <SheetTitle class="sr-only">倍速</SheetTitle>
      <ScrollArea class="min-h-0 flex-1">
        <ul class="flex flex-col gap-2 p-4">
          <li v-for="speed in speeds" :key="speed">
            <Button
              class="w-full h-11"
              :variant="speed === rate ? 'default' : 'outline'"
              :aria-pressed="speed === rate"
              @click="handleSelect(speed)"
            >
              <span>{{ formatRate(speed) }}x</span>
            </Button>
          </li>
        </ul>
      </ScrollArea>
    </SheetContent>
  </Sheet>
  <DropdownMenu v-else v-model:open="open">
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
import { Check, Gauge } from 'lucide-vue-next';
import { Button } from '@ym-video/ui/components/button';
import { ScrollArea } from '@ym-video/ui/components/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@ym-video/ui/components/sheet';
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
const props = defineProps<{
  rate: number;
  container: HTMLElement | null;
  mobile?: boolean;
}>();

// 用户选择的新倍速。
const emit = defineEmits<{ rate: [speed: number] }>();

// 选择倍速后关闭移动端面板，继续观看视频。
const handleSelect = (speed: number) => {
  emit('rate', speed);
  open.value = false;
};

// 整数倍速补一位小数，其余选项保留原有精度。
const formatRate = (speed: number) =>
  Number.isInteger(speed) ? speed.toFixed(1) : String(speed);
</script>
