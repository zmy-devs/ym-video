<template>
  <SidebarLayout class="h-full">
    <template #sidebar><AppSidebar /></template>
    <template #sidebar-footer>
      <div
        class="flex items-center justify-between gap-2 group-data-[collapsible=icon]:flex-col-reverse"
      >
        <AccountMenu />
        <SourceSwitcher />
      </div>
    </template>
    <div class="h-full min-h-0">
      <div
        v-if="library.error && route.path !== '/history'"
        role="alert"
        class="flex h-full flex-col items-center justify-center gap-4"
      >
        <p class="text-muted-foreground">{{ library.error }}</p>
        <Button @click="library.init">重新连接</Button>
      </div>
      <RouterView v-else v-slot="{ Component, route: pageRoute }">
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
      </RouterView>
    </div>
  </SidebarLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import { Button } from '@/components/ui/button';
import SourceSwitcher from '@/components/source-switcher.vue';
import AccountMenu from '@/components/account-menu.vue';
import SidebarLayout from './sidebar-layout.vue';
import AppSidebar from './app-sidebar.vue';
import { useLibraryStore } from '@/stores/library';

// 当前路由用于决定历史页是否跳过资源连接错误。
const route = useRoute();

// 初始化资源及分类，连接失败时在内容区提供重试。
const library = useLibraryStore();

onMounted(() => {
  if (!library.sources.length) {
    return library.init();
  }
});
</script>
