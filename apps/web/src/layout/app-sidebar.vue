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
  <SidebarGroup v-if="history.entries.length">
    <SidebarGroupLabel class="px-0">
      <button
        type="button"
        class="group/section flex h-8 w-full items-center justify-between rounded-md px-2 text-left outline-hidden transition-colors hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        aria-controls="recent-history-menu"
        :aria-expanded="recentOpen"
        @click="recentOpen = !recentOpen"
      >
        <span>最近观看</span>
        <ChevronDown
          class="size-4 shrink-0 opacity-0 transition-[opacity,transform] group-hover/section:opacity-100 group-focus-visible/section:opacity-100"
          :class="{ '-rotate-90': !recentOpen }"
        />
      </button>
    </SidebarGroupLabel>
    <div id="recent-history-menu" v-show="recentOpen">
      <SidebarMenu
        ><SidebarMenuItem
          v-for="item in history.entries.slice(0, 3)"
          :key="item.id"
        >
          <ContextMenu>
            <ContextMenuTrigger class="block">
              <CommonTooltip :label="historyTooltip(item)">
                <SidebarMenuButton
                  as-child
                  class="group-data-[collapsible=icon]:p-1.5!"
                >
                  <RouterLink :to="playerPath(item)" :aria-label="item.name">
                    <MovieAvatar :src="item.pic" />
                    <span>{{ item.name }}</span>
                  </RouterLink>
                </SidebarMenuButton>
              </CommonTooltip>
            </ContextMenuTrigger>
            <HistoryMenuContent :entry="item" />
          </ContextMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </div>
  </SidebarGroup>
  <SidebarGroup>
    <SidebarGroupLabel class="px-0">
      <button
        type="button"
        class="group/section flex h-8 w-full items-center justify-between rounded-md px-2 text-left outline-hidden transition-colors hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        aria-controls="category-menu"
        :aria-expanded="categoriesOpen"
        @click="categoriesOpen = !categoriesOpen"
      >
        <span>分类</span>
        <ChevronDown
          class="size-4 shrink-0 opacity-0 transition-[opacity,transform] group-hover/section:opacity-100 group-focus-visible/section:opacity-100"
          :class="{ '-rotate-90': !categoriesOpen }"
        />
      </button>
    </SidebarGroupLabel>
    <div id="category-menu" v-show="categoriesOpen">
      <SidebarMenu
        v-if="
          library.loading || library.categoryLoading || library.categoryError
        "
      >
        <SidebarMenuItem v-for="i in 4" :key="i">
          <SidebarMenuSkeleton show-icon />
        </SidebarMenuItem>
      </SidebarMenu>
      <SidebarMenu v-else
        ><SidebarMenuItem v-for="item in library.parents" :key="item.id"
          ><CommonTooltip :label="open ? '' : item.name">
            <SidebarMenuButton
              as-child
              :is-active="activeCategoryId === item.id"
              ><RouterLink :to="`/category/${item.id}`"
                ><Film /><span>{{ item.name }}</span></RouterLink
              ></SidebarMenuButton
            >
          </CommonTooltip></SidebarMenuItem
        ></SidebarMenu
      >
    </div>
  </SidebarGroup>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { ChevronDown, Film, History, Home } from 'lucide-vue-next';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSkeleton,
  useSidebar,
} from '@/components/ui/sidebar';
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

// 最近观看分组默认展开，便于继续播放。
const recentOpen = ref(true);

// 分类分组默认展开，便于浏览内容。
const categoriesOpen = ref(true);

// 浏览子分类时，所属大分类仍在侧栏保持选中。
const activeCategoryId = computed(() => {
  if (!route.path.startsWith('/category')) {
    return 0;
  }

  return getCategorySelection(library.categories, Number(route.params.id))
    .parent?.id;
});

// 最近观看提示显示影片名称、当前集进度与所属播放源。
const historyTooltip = (item: HistoryEntry) => {
  // 当前集未记录有效时长时按零进度显示。
  const current = item.progress[String(item.episode)];

  // 与历史卡片一致，观看比例向下取整并限制在 0～100%。
  const percentage =
    current && current.duration > 0
      ? Math.floor(
          Math.max(
            0,
            Math.min(100, (current.currentTime / current.duration) * 100),
          ),
        )
      : 0;

  // 源被移除时仍保留明确的提示。
  const sourceName =
    library.sources.find((source) => source.id === item.sourceId)?.name ||
    '未知播放源';

  return `${item.name} · 观看至${percentage}% · ${sourceName}`;
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
