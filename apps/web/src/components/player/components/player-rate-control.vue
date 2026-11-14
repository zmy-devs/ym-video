<template>
  <Sheet v-if="isMobile" v-model:open="open">
    <SheetTrigger as-child>
      <PlayerButton :label="`播放速度：${formatRate(rate)}x`">
        <Gauge />
      </PlayerButton>
    </SheetTrigger>
    <SheetContent
      :portal-container="container"
      :show-close-button="false"
      class="w-64 gap-0 data-[state=open]:duration-300"
    >
      <SheetTitle class="sr-only">倍速</SheetTitle>
      <ScrollArea class="min-h-0 flex-1">
        <ul class="flex flex-col gap-2 p-4">
          <li v-for="speed in speeds" :key="speed">
            <Button
              class="w-full h-11"
              :variant="speed === rate ? 'default' : 'outline'"
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
      <PlayerButton :label="`播放速度：${formatRate(rate)}x`">
        <Gauge />
      </PlayerButton>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      :portal-container="container"
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
        @select="setRate(speed)"
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
import { usePlayerContext } from '../context.ts';
import { isMobile } from '@/platform';

// 全部可选倍速，常用倍速靠近列表底部。
const speeds = [4, 3, 2, 1, 0.75, 0.5, 0.25];

// 倍速菜单直接读取媒体与打开状态。
const { player, controls } = usePlayerContext();
const { rate, container, setRate } = player;
const { rateOpen: open } = controls;

// 选择倍速后关闭移动端面板，继续观看视频。
const handleSelect = (speed: number) => {
  setRate(speed);
  open.value = false;
};

// 整数倍速补一位小数，其余选项保留原有精度。
const formatRate = (speed: number) =>
  Number.isInteger(speed) ? speed.toFixed(1) : String(speed);
</script>
