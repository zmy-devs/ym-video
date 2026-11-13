<template>
  <nav
    class="mobile-navigation fixed inset-x-0 bottom-0 z-40 flex items-end justify-between gap-2 px-4"
  >
    <Button
      as-child
      variant="outline"
      size="icon"
      class="size-[58px] rounded-full !bg-white/60 backdrop-blur-xl dark:!bg-card/60"
    >
      <RouterLink id="search-trigger" to="/search">
        <Search class="size-6" />
      </RouterLink>
    </Button>
    <Button
      as="div"
      variant="outline"
      size="sm"
      class="grid h-[58px] min-w-0 flex-1 grid-cols-3 items-center gap-1 rounded-full border border-border !bg-white/60 p-1 text-foreground shadow-xs backdrop-blur-xl dark:!bg-card/60"
      role="group"
    >
      <RouterLink
        v-for="item in pages"
        :key="item.path"
        :to="item.name === 'category' ? categoryPath : item.path"
        class="flex min-w-0 self-stretch flex-col items-center justify-center gap-0.5 rounded-full px-1 py-0 transition-colors"
        :class="route.name === item.name && 'bg-muted/60 text-primary shadow-xs'"
      >
        <component :is="item.icon" class="size-6 shrink-0" />
        <span class="max-w-full truncate text-[10px] leading-3">{{
          item.label
        }}</span>
      </RouterLink>
    </Button>

    <SourceSwitcher mobile />
  </nav>
</template>

<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router';
import { History, House, LayoutGrid, Search } from 'lucide-vue-next';
import { Button } from '@ym-video/ui/components/button';
import SourceSwitcher from '@/components/source-switcher.vue';

// 分类入口沿用当前会话最近访问的分类。
defineProps<{ categoryPath: string }>();

const route = useRoute();

const pages = [
  { path: '/overview', name: 'overview', label: '概览', icon: House },
  { path: '/category', name: 'category', label: '分类', icon: LayoutGrid },
  { path: '/history', name: 'history', label: '历史', icon: History },
];
</script>
