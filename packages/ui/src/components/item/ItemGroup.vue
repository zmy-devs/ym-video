<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { cn } from '@ym-video/ui/lib/utils';

const props = defineProps<{
  class?: HTMLAttributes['class'];
}>();
</script>

<template>
  <div
    data-slot="item-group"
    :class="cn('group/item-group flex flex-col', props.class)"
  >
    <slot />
  </div>
</template>
