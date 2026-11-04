<template>
  <SidebarItem
    id="search-trigger"
    :active="route.path === '/search'"
    tooltip="搜索影视资源"
    shortcut="Ctrl K"
    @click="eventBus.emit('search:show')"
  >
    <Search />
    <span>搜索</span>
  </SidebarItem>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useEventListener } from '@vueuse/core';
import { Search } from 'lucide-vue-next';
import SidebarItem from '@ym-video/ui/common/sidebar/item.vue';
import { eventBus } from '@/utils/event-bus';

// 搜索结果页对应的导航状态。
const route = useRoute();

// 快捷键随侧栏入口的生命周期注册，弹窗由根组件持有。
useEventListener(window, 'keydown', (event) => {
  if (event.ctrlKey && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    eventBus.emit('search:toggle');
  }
});
</script>
