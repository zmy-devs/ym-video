<template>
  <SidebarProvider v-model:open="open" :mobile="mobile" class="h-full min-h-0">
    <Sidebar collapsible="icon">
      <SidebarHeader
        :class="[headerClass, hasScrollbar && 'border-b border-sidebar-border']"
      >
        <div
          class="h-8 flex items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center"
        >
          <div
            class="min-w-0 flex items-center gap-2"
            :class="{ 'group-data-[collapsible=icon]:hidden': showTrigger }"
          >
            <img
              v-if="image"
              :src="image"
              alt=""
              class="size-6 shrink-0 rounded-md"
            />
            <span
              class="truncate px-2 text-sm font-semibold group-data-[collapsible=icon]:hidden"
            >
              {{ title }}
            </span>
          </div>
          <Tooltip v-if="showTrigger" label="切换侧边栏" shortcut="Ctrl+B">
            <SidebarTrigger />
          </Tooltip>
        </div>
      </SidebarHeader>
      <SidebarContent class="overflow-hidden">
        <div ref="scrollArea" class="min-h-0 flex-1">
          <ScrollArea class="h-full">
            <div ref="scrollContent" class="flex flex-col">
              <slot />
            </div>
          </ScrollArea>
        </div>
      </SidebarContent>
      <SidebarFooter
        v-if="$slots.footer"
        :class="hasScrollbar && 'border-t border-sidebar-border'"
      >
        <slot name="footer" />
      </SidebarFooter>
    </Sidebar>
    <SidebarInset class="min-h-0 min-w-0">
      <slot name="content" />
    </SidebarInset>
  </SidebarProvider>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, type HTMLAttributes } from 'vue';
import { useMutationObserver, useResizeObserver } from '@vueuse/core';
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from '../../components/sidebar';
import { ScrollArea } from '../../components/scroll-area';
import Tooltip from '../tooltip.vue';

// 应用提供品牌、导航及主体内容，共享侧栏负责布局和滚动。
withDefaults(
  defineProps<{
    title: string;
    image?: string;
    showTrigger?: boolean;
    mobile?: boolean;
    headerClass?: HTMLAttributes['class'];
  }>(),
  { showTrigger: true },
);

// 未受控时沿用底层组件的展开偏好。
const open = defineModel<boolean>('open');

// 只有导航溢出时才显示顶部与底部分隔线。
const hasScrollbar = ref(false);
const scrollArea = ref<HTMLElement | null>(null);
const scrollContent = ref<HTMLElement | null>(null);

// 内容、折叠分组和视口变化后更新分隔线。
const updateScrollbar = () => {
  const viewport = scrollArea.value?.querySelector<HTMLElement>(
    '[data-slot="scroll-area-viewport"]',
  );
  hasScrollbar.value = Boolean(
    viewport && viewport.scrollHeight > viewport.clientHeight,
  );
};

useResizeObserver([scrollArea, scrollContent], updateScrollbar);
useMutationObserver(scrollContent, updateScrollbar, {
  attributes: true,
  attributeFilter: ['style'],
  childList: true,
  subtree: true,
});
onMounted(() => nextTick(updateScrollbar));
</script>
