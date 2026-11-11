<template>
  <LoginTitleBar v-if="isDesktop && route.name === 'login'" />

  <div
    v-if="isMobile"
    class="mobile-shell flex h-svh flex-col overflow-hidden bg-background text-foreground"
    @scroll.capture="handleScroll"
  >
    <RouterView
      v-if="route.matched.length"
      v-slot="{ Component, route: pageRoute }"
    >
      <component
        v-if="!showMobileShell"
        :is="Component"
        :key="pageRoute.fullPath"
      />
      <MobileHeader
        v-if="showMobileShell && pageRoute.name !== 'search'"
        :scrolled="scrolled"
      >
        <div class="flex min-w-0 flex-1 items-center gap-2">
          <Button
            v-if="pageRoute.meta.back"
            variant="outline"
            size="icon"
            aria-label="返回"
            class="size-11 rounded-full !bg-white/60 text-foreground backdrop-blur-xl hover:text-foreground dark:!bg-card/60"
            @click="router.back()"
          >
            <ArrowLeft class="size-5 transform-[translateX(1px)]" />
          </Button>
          <h1
            v-if="showMobileTitle || pageRoute.meta.standalone"
            class="min-w-0 truncate font-semibold"
            :class="[
              pageRoute.meta.standalone ? 'text-lg' : 'text-3xl',
              scrolled && !pageRoute.meta.standalone
                ? 'text-white'
                : 'text-foreground',
            ]"
          >
            {{ pageRoute.meta.title }}
          </h1>
        </div>
        <template v-if="!pageRoute.meta.standalone">
          <AccountMenu
            :client="authClient"
            mobile
            side="bottom"
            align="end"
            @settings="router.push('/settings')"
            @signed-out="handleSignOut"
          />
        </template>
      </MobileHeader>
      <main
        v-show="showMobileShell"
        class="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        :class="
          pageRoute.name === 'settings' && 'pt-[var(--mobile-header-height)]'
        "
      >
        <Transition
          name="mobile-page"
          mode="out-in"
          @after-enter="handlePageEnter"
        >
          <KeepAlive :key="history.ownerId ?? undefined">
            <component
              v-if="pageRoute.meta.keepAlive"
              :is="Component"
              :key="pageRoute.path"
            />
          </KeepAlive>
        </Transition>
        <Transition
          name="mobile-page"
          mode="out-in"
          @after-enter="handlePageEnter"
        >
          <component
            v-if="showMobileShell && !pageRoute.meta.keepAlive"
            :is="Component"
            :key="pageRoute.fullPath"
          />
        </Transition>
      </main>
      <MobileNavigation
        v-if="pageRoute.meta.mobileNav"
        :category-path="categoryPath"
      />
    </RouterView>
  </div>

  <template v-else>
    <TitleBar
      v-if="
        !route.meta.sidebar &&
        route.name !== 'login' &&
        route.name !== 'register' &&
        route.name !== 'player'
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
            class="flex h-full flex-col items-center justify-center gap-4"
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
    <WindowControls v-if="isDesktop" />
  </template>

  <OfflineOverlay v-if="!online" class="z-60" />
  <LoadingOverlay v-else-if="loading" class="z-60" />
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import { ArrowLeft } from 'lucide-vue-next';
import { useEventListener, useOnline, watchImmediate } from '@vueuse/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Button } from '@ym-video/ui/components/button';
import AccountMenu from '@ym-video/ui/account/menu.vue';
import LoadingOverlay from '@ym-video/ui/common/loading-overlay.vue';
import OfflineOverlay from '@ym-video/ui/common/offline-overlay.vue';
import LoginTitleBar from './title-bar/login-title-bar.vue';
import TitleBar from './title-bar/index.vue';
import WindowControls from './title-bar/window-controls.vue';
import SideBar from './side-bar.vue';
import MobileHeader from '@/components/mobile-header.vue';
import MobileNavigation from '@/components/mobile-navigation.vue';
import { isDesktop, isMobile } from '@/platform';
import { useLibraryStore } from '@/stores/library-store';
import { useHistoryStore } from '@/stores/history-store';
import { useThemeStore } from '@/stores/theme-store';
import { useSessionSync } from '@/composables/use-session-sync';
import { useUpdateStore } from '@/stores/update-store';
import { authClient } from '@/services/auth';
import { useMobileScroll } from '@/composables/use-mobile-scroll';
import { useMobileStatusBar } from '@/composables/use-mobile-status-bar';

const route = useRoute();

// 页面按钮负责导航，标题栏只承载插槽内容。
const router = useRouter();

const library = useLibraryStore();
const history = useHistoryStore();
const theme = useThemeStore();
const online = useOnline();

// 页面滚动与缓存位置共同驱动标题栏。
const { scrolled, handleScroll, handlePageEnter } = useMobileScroll();

// 所有移动页面按内容位置和应用主题同步状态栏。
useMobileStatusBar(scrolled);

// 移动端主页面的缓存持续保留，播放、登录和注册页面单独显示。
const showMobileShell = computed(
  () =>
    !route.meta.fullscreen &&
    route.name !== 'login' &&
    route.name !== 'register',
);

// 底部分类入口返回最近访问的分类地址。
const categoryPath = ref('/category');

// 分类、历史页显示随滚动切换颜色的顶部标题。
const showMobileTitle = computed(
  () => isMobile && (route.name === 'category' || route.name === 'history'),
);

// 退出后清理当前设备上的账号历史并返回登录页。
const handleSignOut = () => {
  history.setAccount(null);
  router.replace('/login');
};

watch(
  () => route.fullPath,
  () => {
    scrolled.value = false;

    if (route.name === 'category') {
      categoryPath.value = route.fullPath;
    }
  },
  { immediate: true },
);

// 桌面窗口同步播放器全屏状态。
useEventListener(document, 'fullscreenchange', () => {
  if (isDesktop) {
    getCurrentWindow()
      .setFullscreen(Boolean(document.fullscreenElement))
      .catch(console.error);
  }
});

// 桌面端启动更新检查，移动端由 Android 发布流程负责更新。
let cleanupUpdate: (() => void) | undefined;
onMounted(() => {
  if (isDesktop) {
    cleanupUpdate = useUpdateStore().init();
  }

  if (isMobile && !library.platformSources.length) {
    library.init().catch(console.error);
  }
});
onUnmounted(() => cleanupUpdate?.());

useSessionSync();

// 播放器页面固定暗色，离开后恢复用户主题。
watchImmediate(
  () => route.name,
  (name) => theme.setPlayerMode(name === 'player'),
);
onUnmounted(() => theme.setPlayerMode(false));

// 回到应用时刷新历史并补传离线操作。
useEventListener(window, 'focus', () => history.refresh());
useEventListener(window, 'online', () => history.refresh());

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

// 冒泡阶段阻止浏览器菜单，保留应用自己的右键菜单。
useEventListener(document, 'contextmenu', (event) => event.preventDefault());

const loading = computed(
  () =>
    !route.matched.length ||
    (route.meta.sidebar && library.status === 'loading'),
);
</script>
