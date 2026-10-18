<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { cn } from '@/lib/utils';

const props = defineProps<{
  class?: HTMLAttributes['class'];
}>();
</script>

<template>
  <div
    data-slot="item-description"
    :class="
      cn(
        'text-muted-foreground text-sm leading-normal font-normal truncate',
        '[&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
