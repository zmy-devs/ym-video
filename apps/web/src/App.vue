<template>
  <TooltipProvider>
    <div
      v-if="isDesktop && !route.meta.sidebar && route.name !== 'player'"
      aria-hidden="true"
      class="desktop-title-bar desktop-title-bar-standalone fixed inset-x-0 top-0 z-40 pr-36"
    />
    <p
      v-if="!route.matched.length"
      role="status"
      class="h-full flex items-center justify-center text-sm text-muted-foreground"
    >
      正在连接账号服务…
    </p>
    <RouterView v-else v-slot="{ Component }">
      <KeepAlive :key="history.ownerId ?? undefined" include="AppLayout">
        <component :is="Component" />
      </KeepAlive>
    </RouterView>
    <AppDialogs />
    <Toaster :theme="theme.resolved" position="top-center" />
    <div
      v-if="offline"
      role="status"
      class="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-md bg-destructive px-5 py-3 text-sm text-white"
    >
      {{
        session.data?.user.role === 'admin'
          ? '网络已断开，请检查网络连接'
          : '网络已断开，观看历史会暂存并在联网后同步'
      }}
    </div>
  </TooltipProvider>
</template>

<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue';
import { useEventListener } from '@vueuse/core';
import { RouterView, useRoute, useRouter } from 'vue-router';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import AppDialogs from '@/dialogs/index.vue';
import { useHistoryStore } from '@/stores/history';
import { useThemeStore } from '@/stores/theme';
import { authClient } from '@/services/auth';
import { errorToast } from '@/utils/toast';
import { getLoginReturnPath } from '@/lib/auth';
import { useUpdateStore } from '@/stores/update';

// 桌面壳注入 IPC 时预留原生窗口标题栏区域。
const isDesktop = Boolean(window.ipc);

// 客户端启动后持续监听更新，设置弹窗关闭不影响下载与安装提示。
if (isDesktop) {
  onUnmounted(useUpdateStore().init());
}

// 应用启动时恢复主题，并让提示消息同步明暗模式。
const theme = useThemeStore();

// 监听退出、会话到期和其他标签页同步的登录状态。
const session = authClient.useSession();

// 历史与当前会话保持同一账号归属。
const history = useHistoryStore();

// 当前业务页面用于登录后的站内回跳。
const route = useRoute();

// 会话失效时替换当前页面，避免继续停留在业务界面。
const router = useRouter();

watch(
  session,
  async (value) => {
    if (value.isPending) {
      return;
    }
    if (value.error && ![401, 403].includes(value.error.status)) {
      // 短暂离线不等同于退出；保留已确认账号的本地队列。
      return;
    }
    const currentUser = value.error ? undefined : value.data?.user;
    const nextOwnerId =
      currentUser?.role === 'admin' ? null : (currentUser?.id ?? null);
    const previousOwnerId = history.ownerId;
    const accountTask = history.setAccount(nextOwnerId);
    if (
      previousOwnerId &&
      previousOwnerId !== nextOwnerId &&
      route.name === 'player'
    ) {
      await router.replace(getLoginReturnPath(undefined, currentUser?.role));
    }
    await accountTask;
    if (history.ownerId !== nextOwnerId) {
      return;
    }

    if (
      currentUser?.role === 'admin' &&
      !route.meta.admin &&
      !route.meta.public
    ) {
      await router.replace('/admin/users');
      return;
    }

    if (currentUser && route.meta.admin && currentUser.role !== 'admin') {
      await router.replace('/overview');
      return;
    }
    if (
      currentUser ||
      route.name === 'login' ||
      route.meta.public ||
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
  },
  { immediate: true },
);

// 返回主标签页时重新读取云端历史并补传离线操作。
useEventListener(window, 'focus', () => history.refresh());

// 暂存操作在短暂断网或服务端故障后自动补传。
const historyRetryTimer = setInterval(() => {
  if (
    navigator.onLine &&
    history.ownerId &&
    (history.syncStatus === 'pending' || history.syncStatus === 'error')
  ) {
    history.retry();
  }
}, 30_000);
onUnmounted(() => clearInterval(historyRetryTimer));

// 冒泡阶段只阻止浏览器默认菜单，保留业务右键菜单的事件处理。
useEventListener(document, 'contextmenu', (event) => event.preventDefault());

// 联网状态只提示，不通过路由跳转打断播放器。
const offline = ref(!navigator.onLine);
useEventListener(window, 'online', () => {
  offline.value = false;
  history.retry();
});
useEventListener(window, 'offline', () => {
  offline.value = true;
});
</script>
