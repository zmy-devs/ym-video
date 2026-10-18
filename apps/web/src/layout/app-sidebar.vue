<template>
  <SidebarGroup>
    <SidebarMenu>
      <SearchBox />
      <SidebarMenuItem v-for="item in navigation" :key="item.path">
        <CommonTooltip :label="item.description">
          <SidebarMenuButton as-child :is-active="route.path === item.path"
            ><RouterLink :to="item.path" :aria-label="item.name"
              ><component :is="item.icon" /><span>{{
                item.name
              }}</span></RouterLink
            ></SidebarMenuButton
          >
        </CommonTooltip>
      </SidebarMenuItem>
    </SidebarMenu>
  </SidebarGroup>
  <SidebarGroup v-if="history.sorted.length">
    <SidebarGroupLabel>最近观看</SidebarGroupLabel>
    <SidebarMenu
      ><SidebarMenuItem
        v-for="item in history.sorted.slice(0, 3)"
        :key="item.id"
      >
        <ContextMenu>
          <ContextMenuTrigger class="block">
            <CommonTooltip :label="historyTooltip(item)">
              <SidebarMenuButton as-child>
                <RouterLink
                  :to="playerPath(item)"
                  target="_blank"
                  rel="noopener"
                  :aria-label="item.name"
                >
                  <MovieAvatar
                    :src="item.pic"
                    class="group-data-[collapsible=icon]:size-4"
                  />
                  <span>{{ item.name }}</span>
                </RouterLink>
              </SidebarMenuButton>
            </CommonTooltip>
          </ContextMenuTrigger>
          <HistoryMenuContent :entry="item" />
        </ContextMenu> </SidebarMenuItem
    ></SidebarMenu>
  </SidebarGroup>
  <SidebarGroup>
    <SidebarGroupLabel>分类</SidebarGroupLabel>
    <SidebarMenu v-if="library.loading || library.categoryLoading">
      <SidebarMenuItem v-for="i in 4" :key="i">
        <SidebarMenuSkeleton show-icon />
      </SidebarMenuItem>
    </SidebarMenu>
    <p
      v-else-if="library.categoryError"
      class="px-2 text-xs text-muted-foreground"
    >
      {{ library.categoryError
      }}<Button size="sm" variant="link" @click="library.loadCategories"
        >重试</Button
      >
    </p>
    <SidebarMenu v-else
      ><SidebarMenuItem v-for="item in library.parents" :key="item.id"
        ><CommonTooltip :label="open ? '' : item.name">
          <SidebarMenuButton as-child :is-active="activeCategoryId === item.id"
            ><RouterLink :to="`/category/${item.id}`"
              ><Film /><span>{{ item.name }}</span></RouterLink
            ></SidebarMenuButton
          >
        </CommonTooltip></SidebarMenuItem
      ></SidebarMenu
    >
  </SidebarGroup>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { Home, History, Film } from 'lucide-vue-next';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSkeleton,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { ContextMenu, ContextMenuTrigger } from '@/components/ui/context-menu';
import CommonTooltip from '@/components/common/tooltip.vue';
import HistoryMenuContent from '@/components/common/history-menu-content.vue';
import SearchBox from '@/components/search-box.vue';
import MovieAvatar from '@/components/movie-avatar.vue';
import { useLibraryStore } from '@/stores/library';
import { useHistoryStore } from '@/stores/history';
import { playerPath } from '@/lib/movie';
import { getCategorySelection } from '@/lib/category';
import type { HistoryEntry } from '@/types';

// 导航内容独立于面板拖动和主区域布局。
const route = useRoute();

// 分类的提示只在侧栏收缩时展示。
const { open } = useSidebar();

// 播放源分类与加载状态。
const library = useLibraryStore();

// 当前浏览器中最近观看的影片。
const history = useHistoryStore();

// 浏览子分类时，所属大分类仍在侧栏保持选中。
const activeCategoryId = computed(() => {
  if (!route.path.startsWith('/category')) {
    return 0;
  }

  return getCategorySelection(library.categories, Number(route.params.id))
    .parent?.id;
});

// 最近观看提示始终显示该影片所属的播放源。
const historyTooltip = (item: HistoryEntry) => {
  // 源被移除时仍保留明确的提示。
  const sourceName =
    library.sources.find((source) => source.id === item.sourceId)?.name ||
    '未知播放源';

  return `${item.name} · ${sourceName}`;
};

// 侧边栏固定导航入口。
const navigation = [
  {
    path: '/overview',
    name: '概览',
    icon: Home,
    description: '概览 · 浏览最近更新的影视',
  },
  {
    path: '/history',
    name: '观看历史',
    icon: History,
    description: '观看历史 · 继续上次观看',
  },
];
</script>
