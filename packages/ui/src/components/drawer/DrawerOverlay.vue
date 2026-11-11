<script setup lang="ts">
import type { DrawerOverlayProps } from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import { reactiveOmit } from '@vueuse/core';
import { DrawerOverlay as DrawerOverlayPrimitive } from 'reka-ui';
import { cn } from '@ym-video/ui/lib/utils';

const props = defineProps<
  DrawerOverlayProps & { class?: HTMLAttributes['class'] }
>();

const delegatedProps = reactiveOmit(props, 'class');
</script>

<template>
  <DrawerOverlayPrimitive
    data-slot="drawer-overlay"
    v-bind="delegatedProps"
    :class="
      cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 fixed inset-0 z-50 bg-black/80',
        props.class,
      )
    "
  />
</template>
