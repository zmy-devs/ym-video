<template>
  <Button
    :as="props.as"
    :as-child="props.asChild"
    :disabled="props.disabled"
    :type="props.type"
    variant="outline"
    :class="
      cn(
        'h-14 min-h-14 w-full justify-between gap-3 rounded-2xl !bg-white px-4 py-0 text-base font-normal shadow-none dark:!bg-card',
        props.class,
      )
    "
  >
    <slot />
  </Button>
</template>

<script setup lang="ts">
import type { ButtonHTMLAttributes, HTMLAttributes } from 'vue';
import type { PrimitiveProps } from 'reka-ui';
import { Button } from '@ym-video/ui/components/button';
import { cn } from '@ym-video/ui/lib/utils';

// 设置、播放源与历史操作共用 56px 行高和分组项样式。
const props = defineProps<{
  as?: PrimitiveProps['as'];
  asChild?: boolean;
  disabled?: boolean;
  type?: ButtonHTMLAttributes['type'];
  class?: HTMLAttributes['class'];
}>();
</script>
