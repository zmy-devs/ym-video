<script setup lang="ts">
import type { DrawerContentEmits, DrawerContentProps } from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import { reactiveOmit } from '@vueuse/core';
import {
  DrawerContent as DrawerContentPrimitive,
  DrawerHandle,
  DrawerPortal,
  useForwardPropsEmits,
} from 'reka-ui';
import { cn } from '@ym-video/ui/lib/utils';
import DrawerOverlay from './DrawerOverlay.vue';

defineOptions({ inheritAttrs: false });

const props = defineProps<
  DrawerContentProps & { class?: HTMLAttributes['class'] }
>();
const emits = defineEmits<DrawerContentEmits>();

const delegatedProps = reactiveOmit(props, 'class');
const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerContentPrimitive
      data-slot="drawer-content"
      v-bind="{ ...$attrs, ...forwarded }"
      :class="
        cn(
          'bg-background text-foreground fixed inset-x-0 bottom-0 z-50 flex flex-col gap-4 rounded-t-[10px] border shadow-lg will-change-transform transform-[translate3d(var(--drawer-swipe-movement-x,0px),var(--drawer-swipe-movement-y,0px),0)] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] data-swiping:duration-0 data-swiping:select-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
          props.class,
        )
      "
    >
      <DrawerHandle
        class="mx-auto mt-4 h-2 w-[100px] shrink-0 rounded-full bg-muted-foreground/30"
      />
      <slot />
    </DrawerContentPrimitive>
  </DrawerPortal>
</template>
