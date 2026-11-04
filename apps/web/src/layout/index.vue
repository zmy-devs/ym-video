<template>
  <LoginTitleBar v-if="route.name === 'login'" />
  <TitleBar
    v-else-if="
      isDesktop && !route.meta.sidebar && route.name !== 'player'
    "
    class="desktop-title-bar-standalone fixed inset-x-0 top-0 z-60"
  />
  <RouterView
    v-if="route.matched.length"
    v-slot="{ Component, route: pageRoute }"
  >
    <KeepAlive :key="history.ownerId ?? undefined" include="SideBar">
      <SideBar v-if="pageRoute.meta.sidebar">
        <div
          v-if="library.error && pageRoute.path !== '/history'"
          class="h-full flex flex-col items-center justify-center gap-4"
        >
          <p class="text-muted-foreground">{{ library.error }}</p>
          <Button @click="library.init">重新连接</Button>
        </div>
        <template v-else>
          <KeepAlive>
            <component
              :is="Component"
              v-if="pageRoute.meta.keepAlive"
              :key="pageRoute.path"
            />
          </KeepAlive>
          <component
            :is="Component"
            v-if="!pageRoute.meta.keepAlive"
            :key="pageRoute.fullPath"
          />
        </template>
      </SideBar>
      <component :is="Component" v-else />
    </KeepAlive>
  </RouterView>
  <OfflineOverlay v-if="!online" class="z-60" />
  <LoadingOverlay v-else-if="loading" class="z-60" />
  <WindowControls v-if="isDesktop" />
</template>

<script setup lang="ts">
import TitleBar from './title-bar/index.vue';
import LoginTitleBar from './title-bar/login-title-bar.vue';
import SideBar from './side-bar.vue';
import { isTauri } from '@/lib/desktop';
import { computed, onUnmounted } from 'vue';
import { useEventListener, useOnline, watchImmediate } from '@vueuse/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { RouterView, useRoute } from 'vue-router';
import { Button } from '@ym-video/ui/components/button';
import LoadingOverlay from '@ym-video/ui/common/loading-overlay.vue';
import OfflineOverlay from '@ym-video/ui/common/offline-overlay.vue';
import { useLibraryStore } from '@/stores/library-store';
import WindowControls from './title-bar/window-controls.vue';
import { useHistoryStore } from '@/stores/history-store';
import { useThemeStore } from '@/stores/theme-store';
import { useSessionSync } from '@/composables/use-session-sync';
import { useUpdateStore } from '@/stores/update-store';

// 桌面窗口同步浏览器播放器的全屏状态。
const isDesktop = isTauri();

// 浏览器进入或退出全屏时同步原生窗口状态。
useEventListener(document, 'fullscreenchange', () => {
  if (isDesktop) {
    getCurrentWindow()
      .setFullscreen(Boolean(document.fullscreenElement))
      .catch(console.error);
  }
});

// 客户端启动后持续监听更新，设置弹窗关闭不影响下载与安装提示。
if (isDesktop) {
  onUnmounted(useUpdateStore().init());
}

// 应用启动时恢复主题，并让提示消息同步明暗模式。
const theme = useThemeStore();

// 监听退出、会话到期和其他标签页同步的登录状态。
useSessionSync();

// 历史与当前会话保持同一账号归属。
const history = useHistoryStore();

// 当前业务页面用于登录后的站内回跳。
const route = useRoute();

// 播放器整窗固定暗色，包含窗口控件、弹层和提示消息。
watchImmediate(
  () => route.name,
  (name) => theme.setPlayerMode(name === 'player'),
);
onUnmounted(() => theme.setPlayerMode(false));

// 返回主标签页时重新读取云端历史并补传离线操作。
useEventListener(window, 'focus', () => history.refresh());

// 暂存操作在短暂断网或服务端故障后自动补传。
const historyRetryTimer = setInterval(() => {
  if (
    navigator.onLine &&
    history.ownerId &&
    (history.syncStatus === 'pending' || history.syncStatus === 'error')
  ) {
    history.refresh();
  }
}, 30_000);
onUnmounted(() => clearInterval(historyRetryTimer));

// 冒泡阶段只阻止浏览器默认菜单，保留业务右键菜单的事件处理。
useEventListener(document, 'contextmenu', (event) => event.preventDefault());

// 断网界面覆盖当前页面，联网后恢复原内容并补传历史。
const online = useOnline();
useEventListener(window, 'online', () => history.refresh());

// 首次路由确认与资源初始化共用全屏加载层。
const library = useLibraryStore();
const loading = computed(
  () =>
    !route.matched.length ||
    (route.meta.sidebar && library.status === 'loading'),
);
</script>
