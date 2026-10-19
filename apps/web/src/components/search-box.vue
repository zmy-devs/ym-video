<template>
  <SidebarMenuItem>
    <CommonTooltip label="搜索影视资源" :shortcut="shortcut">
      <SidebarMenuButton
        id="search-trigger"
        :is-active="route.path === '/search'"
        aria-label="搜索"
        @click="eventBus.emit('search:show')"
      >
        <Search />
        <span>搜索</span>
      </SidebarMenuButton>
    </CommonTooltip>
  </SidebarMenuItem>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useEventListener } from '@vueuse/core';
import { Search } from 'lucide-vue-next';
import CommonTooltip from '@/components/common/tooltip.vue';
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { eventBus } from '@/utils/event-bus';

// 搜索结果页对应的导航状态。
const route = useRoute();

// 提示使用当前平台对应的搜索快捷键。
const shortcut = navigator.userAgent.includes('Mac') ? '⌘ K' : 'Ctrl K';

// 快捷键随侧栏入口的生命周期注册，弹窗由根组件持有。
useEventListener(window, 'keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    eventBus.emit('search:toggle');
  }
});
</script>
