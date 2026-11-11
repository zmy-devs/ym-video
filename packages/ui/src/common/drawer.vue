<template>
  <DrawerRoot v-model:open="open">
    <slot name="trigger" />
    <DrawerContent
      v-bind="$attrs"
      class="max-h-[calc(100svh-var(--mobile-safe-top))] gap-0 overflow-hidden rounded-t-4xl"
      :class="fullHeight && 'h-[calc(100svh-var(--mobile-safe-top))]'"
    >
      <DrawerHeader
        v-if="title || $slots.header"
        class="mx-auto w-full max-w-lg shrink-0 pt-6 pb-4"
        :class="$slots.actions && 'pr-20'"
      >
        <slot name="header">
          <DrawerTitle class="text-xl">{{ title }}</DrawerTitle>
          <DrawerDescription v-if="description" class="sr-only">
            {{ description }}
          </DrawerDescription>
        </slot>
      </DrawerHeader>
      <div v-if="$slots.actions" class="absolute top-4 right-4">
        <slot name="actions" />
      </div>
      <ScrollArea class="min-h-0 flex-1">
        <slot />
      </ScrollArea>
    </DrawerContent>
  </DrawerRoot>
</template>

<script setup lang="ts">
import {
  Drawer as DrawerRoot,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@ym-video/ui/components/drawer';
import { ScrollArea } from '@ym-video/ui/components/scroll-area';

// 内容属性和关闭焦点事件由底层抽屉内容接收。
defineOptions({ inheritAttrs: false });

// 通用抽屉统一标题、操作区、滚动区域和展开高度。
defineProps<{ title?: string; description?: string; fullHeight?: boolean }>();

// 打开状态由调用方持有，平台能力在应用层接入。
const open = defineModel<boolean>('open', { required: true });
</script>
