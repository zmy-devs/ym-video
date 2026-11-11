<script setup lang="ts">
import type { SelectTriggerProps } from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import { ChevronDown } from 'lucide-vue-next';
import { reactiveOmit } from '@vueuse/core';
import { cn } from '@ym-video/ui/lib/utils';
import { SelectIcon, SelectTrigger, useForwardProps } from 'reka-ui';

// 选择器触发按钮可按场景控制尾部图标。
const props = withDefaults(
  defineProps<
    SelectTriggerProps & {
      class?: HTMLAttributes['class'];
      size?: 'sm' | 'default';
      showIcon?: boolean;
    }
  >(),
  { size: 'default', showIcon: true },
);

// 展示配置只由本组件使用，其余属性交给 Select primitive。
const delegatedProps = reactiveOmit(props, 'class', 'size', 'showIcon');
const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <SelectTrigger
    data-slot="select-trigger"
    :data-size="size"
    v-bind="forwardedProps"
    :class="
      cn(
        `border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50    dark:bg-input/30 dark:hover:bg-input/50 flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4`,
        props.class,
      )
    "
  >
    <slot />
    <SelectIcon v-if="showIcon" as-child>
      <ChevronDown class="size-4 opacity-50" />
    </SelectIcon>
  </SelectTrigger>
</template>
