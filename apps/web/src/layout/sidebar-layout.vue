<template>
  <SidebarProvider v-model:open="open" class="min-h-0">
    <Sidebar
      :collapsible="collapsible ? 'icon' : 'none'"
      :class="collapsible ? undefined : 'shrink-0 border-r'"
    >
      <SidebarHeader v-if="$slots['sidebar-header']">
        <slot name="sidebar-header" />
      </SidebarHeader>
      <SidebarContent>
        <slot name="sidebar" />
      </SidebarContent>
      <SidebarFooter v-if="$slots['sidebar-footer']">
        <slot name="sidebar-footer" />
      </SidebarFooter>
    </Sidebar>
    <SidebarInset class="min-h-0 min-w-0">
      <header v-if="collapsible" class="flex h-12 shrink-0 items-center px-4">
        <CommonTooltip
          :label="open ? '收起侧边栏 · Ctrl+B' : '展开侧边栏 · Ctrl+B'"
        >
          <SidebarTrigger :aria-label="open ? '收起侧边栏' : '展开侧边栏'" />
        </CommonTooltip>
      </header>
      <div class="min-h-0 flex-1">
        <slot />
      </div>
    </SidebarInset>
  </SidebarProvider>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import CommonTooltip from '@/components/common/tooltip.vue';

// 侧栏使用默认宽度，业务内容通过具名插槽传入。
withDefaults(
  defineProps<{
    collapsible?: boolean;
  }>(),
  {
    collapsible: false,
  },
);

// 展开状态同步组件自带的收缩按钮与快捷键。
const open = ref(true);
</script>
