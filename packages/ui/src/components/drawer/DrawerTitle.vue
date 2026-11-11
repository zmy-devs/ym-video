<script setup lang="ts">
import type { DrawerTitleProps } from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import { reactiveOmit } from '@vueuse/core';
import { DrawerTitle as DrawerTitlePrimitive } from 'reka-ui';
import { cn } from '@ym-video/ui/lib/utils';

const props = defineProps<
  DrawerTitleProps & { class?: HTMLAttributes['class'] }
>();

const delegatedProps = reactiveOmit(props, 'class');
</script>

<template>
  <DrawerTitlePrimitive
    data-slot="drawer-title"
    v-bind="delegatedProps"
    :class="cn('text-foreground font-semibold', props.class)"
  >
    <slot />
  </DrawerTitlePrimitive>
</template>
