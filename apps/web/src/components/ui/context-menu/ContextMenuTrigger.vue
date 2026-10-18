<script setup lang="ts">
import type { ContextMenuTriggerProps } from 'reka-ui';
import { ContextMenuTrigger, useForwardProps } from 'reka-ui';

// 沿用组件库的触发器属性与禁用状态。
const props = defineProps<ContextMenuTriggerProps>();

// 将默认属性透传给底层触发器。
const forwardedProps = useForwardProps(props);

// 组件库异步判断默认行为前，避免全局右键拦截阻止业务菜单。
const handleContextMenu = (event: MouseEvent) => {
  if (!props.disabled) {
    event.stopPropagation();
  }
};
</script>

<template>
  <ContextMenuTrigger
    data-slot="context-menu-trigger"
    v-bind="forwardedProps"
    @contextmenu="handleContextMenu"
  >
    <slot />
  </ContextMenuTrigger>
</template>
