<template>
  <Sidebar
    v-model:open="open"
    :mobile="false"
    title="Ym Video"
    :image="icon"
    :show-trigger="!isDesktop"
    :header-class="
      isDesktop && 'desktop-title-bar shrink-0 justify-center py-0'
    "
  >
    <SidebarGroup>
      <SearchBox />
      <SidebarItem
        v-for="item in navigation"
        :key="item.path"
        as-child
        :active="route.path === item.path"
        :tooltip="open ? '' : item.name"
        class="data-[active=true]:text-primary"
      >
        <RouterLink :to="item.path">
          <component :is="item.icon" />
          <span>{{ item.name }}</span>
        </RouterLink>
      </SidebarItem>
    </SidebarGroup>
    <SidebarGroup
      v-if="recentEntries.length"
      id="recent-history-menu"
      title="最近观看"
      collapsible
    >
      <ContextMenu v-for="item in recentEntries" :key="item.id">
        <ContextMenuTrigger as-child>
          <SidebarItem
            as-child
            :tooltip="historyTooltip(item)"
            align="start"
            class="group-data-[collapsible=icon]:p-1.5!"
          >
            <RouterLink :to="playerPath(item)">
              <MoviePoster
                :src="item.pic"
                class="size-5 shrink-0 rounded-full"
              />
              <span>{{ item.name }}</span>
            </RouterLink>
          </SidebarItem>
        </ContextMenuTrigger>
        <HistoryMenuContent :entry="item" />
      </ContextMenu>
    </SidebarGroup>
    <SidebarGroup id="category-menu" title="分类" collapsible>
      <template v-if="categoriesLoading">
        <SidebarMenuItem v-for="i in 4" :key="i">
          <SidebarMenuSkeleton show-icon />
        </SidebarMenuItem>
      </template>
      <template v-else>
        <SidebarItem
          v-for="item in library.parents"
          :key="item.id"
          as-child
          :active="activeCategoryId === item.id"
          :tooltip="open ? '' : item.name"
          class="data-[active=true]:text-primary"
        >
          <RouterLink :to="`/category/${item.id}`">
            <Film />
            <span>{{ item.name }}</span>
          </RouterLink>
        </SidebarItem>
      </template>
    </SidebarGroup>
    <template #footer>
      <div
        class="flex items-center justify-between gap-2 group-data-[collapsible=icon]:flex-col-reverse"
      >
        <AccountMenu
          :client="authClient"
          @settings="eventBus.emit('settings:show')"
          @signed-out="history.setAccount(null)"
        />
        <SourceSwitcher />
      </div>
    </template>
    <template #content>
      <TitleBar v-if="isDesktop" class="pl-2">
        <Tooltip
          :label="open ? '收起侧边栏' : '展开侧边栏'"
          shortcut="Ctrl+B"
          side="bottom"
        >
          <SidebarTrigger />
        </Tooltip>
      </TitleBar>
      <div class="min-h-0 flex-1">
        <slot />
      </div>
    </template>
  </Sidebar>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { Film, History, Home } from 'lucide-vue-next';
import {
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarTrigger,
} from '@ym-video/ui/components/sidebar';
import Sidebar from '@ym-video/ui/common/sidebar/index.vue';
import SidebarGroup from '@ym-video/ui/common/sidebar/group.vue';
import SidebarItem from '@ym-video/ui/common/sidebar/item.vue';
import AccountMenu from '@ym-video/ui/account/menu.vue';
import SourceSwitcher from '@/components/source-switcher.vue';
import TitleBar from './title-bar/index.vue';
import { authClient } from '@/services/auth';
import { eventBus } from '@/utils/event-bus';
import { isDesktop } from '@/platform';
import icon from '../../../../assets/icon.png';
import {
  ContextMenu,
  ContextMenuTrigger,
} from '@ym-video/ui/components/context-menu';
import Tooltip from '@ym-video/ui/common/tooltip.vue';
import HistoryMenuContent from '@/components/history-menu-content.vue';
import SearchBox from '@/components/search-box.vue';
import MoviePoster from '@/components/movie-card/poster.vue';
import { useLibraryStore } from '@/stores/library-store';
import { useHistoryStore } from '@/stores/history-store';
import { playerPath } from '@/lib/movie';
import { getCategorySelection } from '@/lib/category';
import { getProgress } from '../components/player/utils/time.ts';
import type { HistoryEntry } from '@/types';

// 影视侧栏在进入播放器时缓存，返回后恢复导航与滚动状态。
defineOptions({ name: 'SideBar' });

// 桌面品牌区域用于拖动窗口，收缩按钮放在内容标题栏。
// 当前页面决定导航选中态。
const route = useRoute();

// 导航和分类的提示只在侧栏收起时展示。
const open = ref(true);

// 播放源分类与加载状态。
const library = useLibraryStore();

// 当前设备中最近观看的影片。
const history = useHistoryStore();

// 首次进入影视页面时加载资源与分类。
onMounted(() => {
  if (!library.sources.length) {
    return library.init();
  }
});

// 分类加载和失败时使用骨架占位。
const categoriesLoading = computed(
  () =>
    library.status === 'loading' ||
    library.categoryStatus === 'loading' ||
    !!library.categoryError,
);

// 侧栏最多展示三条最近观看记录。
const recentEntries = computed(() => history.entries.slice(0, 3));

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
  const episodeLabel = historyEpisodeLabel(item);
  // 当前集未记录有效时长时按零进度显示。
  const current = item.progress[String(item.episode)];

  // 与历史卡片一致，观看比例向下取整并限制在 0～100%。
  const percentage = Math.floor(
    getProgress(current?.currentTime ?? 0, current?.duration ?? 0),
  );

  // 源被移除时仍保留明确的提示。
  const sourceName =
    library.sources.find((source) => source.id === item.sourceId)?.name ||
    '未知播放源';

  return `${item.name}
  ${episodeLabel} · 观看至${percentage}% · ${sourceName}`;
};

// 最近观看列表与历史卡片共用当前集名称。
const historyEpisodeLabel = (item: HistoryEntry) =>
  item.episodes[item.episode]?.label || '第 1 集';

// 侧边栏固定导航入口。
const navigation = [
  {
    path: '/overview',
    name: '概览',
    icon: Home,
  },
  {
    path: '/history',
    name: '观看历史',
    icon: History,
  },
];
</script>
