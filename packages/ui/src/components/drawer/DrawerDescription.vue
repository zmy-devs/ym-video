<script setup lang="ts">
import type { DrawerDescriptionProps } from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import { reactiveOmit } from '@vueuse/core';
import { DrawerDescription as DrawerDescriptionPrimitive } from 'reka-ui';
import { cn } from '@ym-video/ui/lib/utils';

const props = defineProps<
  DrawerDescriptionProps & { class?: HTMLAttributes['class'] }
>();

const delegatedProps = reactiveOmit(props, 'class');
</script>

<template>
  <DrawerDescriptionPrimitive
    data-slot="drawer-description"
    v-bind="delegatedProps"
    :class="cn('text-muted-foreground text-sm', props.class)"
  >
    <slot />
  </DrawerDescriptionPrimitive>
</template>
