<template>
  <SidebarProvider v-model:open="open" class="min-h-0">
    <Sidebar collapsible="icon">
      <SidebarHeader
        :class="
          isDesktop
            ? 'h-(--desktop-window-controls-height) shrink-0 justify-center py-0'
            : undefined
        "
      >
        <div
          class="h-8 flex items-center justify-between group-data-[collapsible=icon]:justify-center"
        >
          <div
            class="min-w-0 ml-1 flex items-center gap-2 group-data-[collapsible=icon]:hidden"
          >
            <img :src="icon" alt="" class="size-6 shrink-0 rounded-md" />
            <span class="truncate text-sm font-semibold">Ym Video</span>
          </div>
          <CommonTooltip
            :label="open ? '收起侧边栏' : '展开侧边栏'"
            shortcut="Ctrl+B"
          >
            <SidebarTrigger :aria-label="open ? '收起侧边栏' : '展开侧边栏'" />
          </CommonTooltip>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <slot name="sidebar" />
      </SidebarContent>
      <SidebarFooter v-if="$slots['sidebar-footer']">
        <slot name="sidebar-footer" />
      </SidebarFooter>
    </Sidebar>
    <SidebarInset class="min-h-0 min-w-0">
      <div
        v-if="isDesktop"
        aria-hidden="true"
        class="desktop-title-bar shrink-0 pr-36"
      />
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
import icon from '@/assets/icon.svg';

// 桌面标题栏与侧栏品牌同行，并随侧栏宽度自动调整。
const isDesktop = Boolean(window.ipc);

// 展开状态同步组件自带的收缩按钮与快捷键。
const open = ref(true);
</script>
