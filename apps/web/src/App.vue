<template>
  <TooltipProvider>
    <RouterView />
    <Toaster :theme="theme.resolved" rich-colors position="top-center" />
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
import { ref, watch, onMounted } from 'vue';
import { useEventListener } from '@vueuse/core';
import { RouterView, useRoute, useRouter } from 'vue-router';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useHistoryStore } from '@/stores/history';
import { useThemeStore } from '@/stores/theme';
import { authClient } from '@/services/auth';
import { errorToast } from '@/utils/toast';

// 应用启动时恢复主题，并让提示消息同步明暗模式。
const theme = useThemeStore();

// 监听退出、会话到期和其他标签页同步的登录状态。
const session = authClient.useSession();

// 当前业务页面用于登录后的站内回跳。
const route = useRoute();

// 会话失效时替换当前页面，避免继续停留在业务界面。
const router = useRouter();

watch(session, async (value) => {
  if (
    value.isPending ||
    value.error ||
    value.data?.user ||
    route.name === 'login' ||
    !route.matched.length
  ) {
    return;
  }

  await router
    .replace({
      name: 'login',
      query: { redirect: route.fullPath },
    })
    .catch(() => {
      errorToast('无法打开登录页面，请刷新后重试');
    });
});

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
