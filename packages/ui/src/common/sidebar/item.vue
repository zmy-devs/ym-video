<template>
  <SidebarMenuItem>
    <Tooltip :label="tooltip" :shortcut="shortcut" :align="align">
      <SidebarMenuButton
        v-bind="$attrs"
        :as-child="asChild"
        :is-active="active"
        :class="props.class"
      >
        <slot />
      </SidebarMenuButton>
    </Tooltip>
  </SidebarMenuItem>
</template>

<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { SidebarMenuItem, SidebarMenuButton } from '../../components/sidebar';
import Tooltip from '../tooltip.vue';

// 菜单项统一提供按钮、选中态和提示，插槽可使用路由链接。
const props = withDefaults(
  defineProps<{
    active?: boolean;
    asChild?: boolean;
    tooltip?: string;
    shortcut?: string;
    align?: 'start' | 'center' | 'end';
    class?: HTMLAttributes['class'];
  }>(),
  { tooltip: '' },
);

// 入口属性交给按钮，外层列表项仅保留结构。
defineOptions({ inheritAttrs: false });
</script>
