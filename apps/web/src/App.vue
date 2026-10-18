<template>
  <TooltipProvider>
    <RouterView />
    <Toaster :theme="theme.resolved" rich-colors position="top-right" />
    <div
      v-if="offline"
      role="status"
      class="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-md bg-destructive px-5 py-3 text-sm text-white"
    >
      网络已断开，观看历史仍可在本浏览器中保存
    </div>
  </TooltipProvider>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useEventListener } from '@vueuse/core';
import { RouterView } from 'vue-router';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useHistoryStore } from '@/stores/history';
import { useThemeStore } from '@/stores/theme';

// 应用启动时恢复主题，并让提示消息同步明暗模式。
const theme = useThemeStore();

// 返回主标签页时重新读取播放器保存的本地历史。
const history = useHistoryStore();

useEventListener(window, 'focus', () => history.refresh());

// 冒泡阶段只阻止浏览器默认菜单，保留业务右键菜单的事件处理。
useEventListener(document, 'contextmenu', (event) => event.preventDefault());

// 联网状态只提示，不通过路由跳转打断播放器。
const offline = ref(!navigator.onLine);
useEventListener(window, 'online', () => {
  offline.value = false;
});
useEventListener(window, 'offline', () => {
  offline.value = true;
});
onMounted(history.init);
</script>
