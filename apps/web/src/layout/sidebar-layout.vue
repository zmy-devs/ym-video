<template>
  <SidebarProvider v-model:open="open" class="min-h-0">
    <Sidebar collapsible="icon">
      <SidebarHeader
        :class="[
          isDesktop && 'desktop-title-bar shrink-0 justify-center py-0',
          sidebarHasScrollbar && 'border-b border-sidebar-border',
        ]"
      >
        <div
          class="h-8 flex items-center justify-between group-data-[collapsible=icon]:justify-center"
        >
          <div
            class="min-w-0 ml-1 flex items-center gap-2"
            :class="{ 'group-data-[collapsible=icon]:hidden': !isDesktop }"
          >
            <img :src="icon" alt="" class="size-6 shrink-0 rounded-md" />
            <span
              class="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden"
            >
              Ym Video
            </span>
          </div>
          <CommonTooltip
            v-if="!isDesktop"
            :label="open ? '收起侧边栏' : '展开侧边栏'"
            shortcut="Ctrl+B"
          >
            <SidebarTrigger :aria-label="open ? '收起侧边栏' : '展开侧边栏'" />
          </CommonTooltip>
        </div>
      </SidebarHeader>
      <SidebarContent class="overflow-hidden">
        <div ref="sidebarScrollArea" class="min-h-0 flex-1">
          <ScrollArea class="h-full">
            <div ref="sidebarScrollContent" class="flex flex-col gap-2">
              <slot name="sidebar" />
            </div>
          </ScrollArea>
        </div>
      </SidebarContent>
      <SidebarFooter
        v-if="$slots['sidebar-footer']"
        :class="sidebarHasScrollbar && 'border-t border-sidebar-border'"
      >
        <slot name="sidebar-footer" />
      </SidebarFooter>
    </Sidebar>
    <SidebarInset class="min-h-0 min-w-0">
      <div
        v-if="isDesktop"
        class="desktop-title-bar shrink-0 flex items-center border-b pl-2 pr-36"
      >
        <CommonTooltip
          :label="open ? '收起侧边栏' : '展开侧边栏'"
          shortcut="Ctrl+B"
          side="bottom"
        >
          <SidebarTrigger :aria-label="open ? '收起侧边栏' : '展开侧边栏'" />
        </CommonTooltip>
      </div>
      <div class="min-h-0 flex-1">
        <slot />
      </div>
    </SidebarInset>
  </SidebarProvider>
</template>

<script setup lang="ts">
import { isTauri } from '@/lib/desktop';
import { nextTick, onMounted, ref } from 'vue';
import { useMutationObserver, useResizeObserver } from '@vueuse/core';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import icon from '../../../../assets/icon.png';

// 桌面标题栏与侧栏品牌同行，并随侧栏宽度自动调整。
const isDesktop = isTauri();

// 展开状态同步组件自带的收缩按钮与快捷键。
const open = ref(true);

// 侧栏内容溢出时才显示顶部与底部的分隔线。
const sidebarHasScrollbar = ref(false);

// 侧栏滚动区与其内容用于检测实际溢出情况。
const sidebarScrollArea = ref<HTMLElement | null>(null);
const sidebarScrollContent = ref<HTMLElement | null>(null);

// 内容或视口尺寸变化时同步分隔线状态。
const updateSidebarScrollbar = () => {
  const viewport = sidebarScrollArea.value?.querySelector<HTMLElement>(
    '[data-slot="scroll-area-viewport"]',
  );

  sidebarHasScrollbar.value = Boolean(
    viewport && viewport.scrollHeight > viewport.clientHeight,
  );
};

useResizeObserver(
  [sidebarScrollArea, sidebarScrollContent],
  updateSidebarScrollbar,
);

useMutationObserver(sidebarScrollContent, updateSidebarScrollbar, {
  attributes: true,
  attributeFilter: ['style'],
  childList: true,
  subtree: true,
});

onMounted(() => {
  nextTick(updateSidebarScrollbar);
});
</script>
