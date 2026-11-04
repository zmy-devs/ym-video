<template>
  <RouterView
    v-if="route.matched.length"
    v-slot="{ Component, route: pageRoute }"
  >
    <SideBar v-if="pageRoute.meta.sidebar">
      <div :key="pageRoute.path" class="h-full overflow-auto">
        <component :is="Component" />
      </div>
    </SideBar>
    <component :is="Component" v-else />
  </RouterView>
  <OfflineOverlay v-if="!online" />
  <LoadingOverlay v-else-if="!route.matched.length" />
</template>

<script setup lang="ts">
import { useOnline } from '@vueuse/core';
import { RouterView, useRoute } from 'vue-router';
import LoadingOverlay from '@ym-video/ui/common/loading-overlay.vue';
import OfflineOverlay from '@ym-video/ui/common/offline-overlay.vue';
import SideBar from './side-bar.vue';
import { useSessionSync } from '@/composables/use-session-sync';

// 管理应用在布局层编排页面和会话生命周期。
const route = useRoute();
useSessionSync();

// 连接恢复后直接显示原来的管理页面。
const online = useOnline();
</script>
