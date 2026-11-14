<template>
  <MobilePullRefresh
    class="h-full"
    :disabled="!isMobile || !active || loading"
    :refresh="handleRefresh"
  >
    <ScrollArea class="h-full" @scroll.capture="handleScroll">
      <div
        data-slot="catalogue-page"
        :class="[
          'mx-auto w-full max-w-[1400px]',
          isMobile && 'pt-mobile-header pb-mobile-navigation px-4',
          isMobile && !isOverview && 'mt-4',
          !isMobile && 'px-10 py-8',
        ]"
      >
        <WelcomeGreeting
          v-if="isOverview && !isMobile"
          class="mb-10 py-6 text-center text-3xl font-semibold tracking-tight"
        />
        <WelcomeGreeting
          v-else-if="isMobile && isOverview"
          prefix="Hi"
          name=""
          class="mb-6 text-3xl leading-10 font-semibold"
        />
        <MobileCategoryNavigation v-if="isMobile && isCategory" />
        <section v-if="isOverview && history.entries.length" class="mb-10">
          <h2
            id="continue-heading"
            class="mb-5 text-lg font-semibold sm:text-xl"
          >
            最近观看
          </h2>
          <div
            v-if="isMobile"
            class="-mx-4 w-[calc(100%+2rem)] overflow-x-auto"
          >
            <div
              class="flex w-max min-w-full snap-x snap-mandatory gap-3 px-4 pb-2"
            >
              <div
                v-for="item in history.entries.slice(0, 6)"
                :key="item.id"
                class="w-[40vw] shrink-0 snap-start"
              >
                <MovieCard
                  :movie="item"
                  :entry="item"
                  mobile-actions
                  @long-press="handleLongPress(item)"
                />
              </div>
            </div>
          </div>
          <div
            v-else
            class="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-5 gap-y-7"
          >
            <MovieCard
              v-for="item in history.entries.slice(0, 6)"
              :key="item.id"
              :movie="item"
              :entry="item"
            />
          </div>
        </section>
        <section>
          <h2
            v-if="isOverview"
            id="catalogue-heading"
            class="mb-5 text-lg font-semibold sm:text-xl"
          >
            {{ title }}
          </h2>
          <h1
            v-else-if="!isMobile"
            id="catalogue-heading"
            class="mb-6 text-xl font-semibold tracking-tight sm:text-2xl"
          >
            {{ title }}
          </h1>
          <div v-if="hasFilters && !isMobile" class="mb-6 flex flex-wrap gap-2">
            <Button
              v-for="item in selection.children"
              :key="item.id"
              size="sm"
              :variant="
                selection.selectedId === item.id ? 'default' : 'outline'
              "
              @click="handleCategoryChange(item.id)"
            >
              {{ item.name }}
            </Button>
          </div>
          <CatalogueResults
            ref="results"
            :source="query.source"
            :category="query.category"
            :keyword="query.keyword"
            :active="active"
            :loading="loading"
            :empty-label="isSearch ? '没有找到相关影片' : '暂无影片'"
          />
        </section>
      </div>
    </ScrollArea>
    <MobileHistoryActionDrawer
      v-if="isMobile && isOverview"
      v-model:open="actionOpen"
      :entry="selectedEntry"
    />
  </MobilePullRefresh>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Button } from '@ym-video/ui/components/button';
import { ScrollArea } from '@ym-video/ui/components/scroll-area';
import MovieCard from '@/components/movie-card/index.vue';
import WelcomeGreeting from '../components/greeting.vue';
import CatalogueResults from '@/components/catalogue-results.vue';
import MobileCategoryNavigation from '@/components/mobile-category-navigation.vue';
import MobileHistoryActionDrawer from '@/components/mobile-history-action-drawer.vue';
import MobilePullRefresh from '@/components/mobile-pull-refresh.vue';
import { useLibraryStore } from '@/stores/library-store';
import { useHistoryStore } from '@/stores/history-store';
import { useCachedScroll } from '@/composables/use-cached-scroll';
import { getCategorySelection } from '@/utils/category';
import { isMobile } from '@/platform';
import type { HistoryEntry } from '@/types';

// 每页沿用创建时的路由信息，缓存的概览不会跟随其他页面变成分类或搜索。
const route = { ...useRoute() };

// 页面重新激活时保留列表滚动位置，隐藏页面暂停自动加载。
const { active, handleScroll } = useCachedScroll();

// 页面导航与返回操作。
const router = useRouter();

// 可用资源源及分类状态。
const library = useLibraryStore();

// 当前设备的观看历史。
const history = useHistoryStore();

// 概览最近观看的卡片共用一个历史操作抽屉。
const selectedEntry = ref<HistoryEntry | null>(null);

// 长按卡片时显示所选记录的操作。
const actionOpen = ref(false);

// 移动端最近观看沿用历史页的长按操作。
const handleLongPress = (entry: HistoryEntry) => {
  selectedEntry.value = entry;
  actionOpen.value = true;
};

watch(actionOpen, (open) => {
  if (!open) {
    selectedEntry.value = null;
  }
});

// 目录初始化和分类切换期间暂停下拉操作。
const loading = computed(
  () => library.status === 'loading' || library.categoryStatus === 'loading',
);

// 目录列表向页面提供保留内容的刷新入口。
const results =
  useTemplateRef<InstanceType<typeof CatalogueResults>>('results');

// 刷新当前筛选的影片，概览同时拉取最近观看记录。
const handleRefresh = async () => {
  if (library.status === 'error') {
    await library.init();
    await nextTick();
  } else if (library.categoryStatus === 'error') {
    await library.loadCategories();
    await nextTick();
  }

  await Promise.all([
    results.value?.refresh(),
    isOverview.value && history.refresh(),
  ]);
};

// 当前是否展示概览。
const isOverview = computed(() => route.path === '/overview');

// 当前是否展示关键词搜索结果。
const isSearch = computed(() => route.path === '/search');

// 当前是否展示分类筛选。
const isCategory = computed(() => route.path.startsWith('/category'));

// 当前 URL 中的分类 ID。
const categoryId = computed(() => Number(route.params.id) || 0);

// 大类、实际子类和请求 ID 使用同一套映射，避免标题与列表错位。
const selection = computed(() =>
  getCategorySelection(library.categories, categoryId.value),
);

// 只有实际存在子分类时才展示筛选按钮。
const hasFilters = computed(
  () => isCategory.value && selection.value.children.length > 0,
);

// 当前输入的搜索关键词。
const keyword = computed(() =>
  typeof route.query.q === 'string' ? route.query.q.trim() : '',
);

// 按页面及筛选条件显示的标题。
const title = computed(() => {
  if (isOverview.value) {
    return '最近更新';
  }
  if (isSearch.value) {
    return keyword.value ? `“${keyword.value}”` : '搜索影视';
  }
  return selection.value.parent?.name ?? '全部分类';
});

// 分类按钮切换与地址栏保持同步，分类请求沿用现有分页逻辑。
const handleCategoryChange = (id: number) => {
  return router.push(`/category/${id}`);
};

// 当前页面为共享结果列表提供查询条件。
const query = computed(() => {
  if (
    !library.source ||
    (isSearch.value && !keyword.value) ||
    (isCategory.value && !selection.value.selectedId)
  ) {
    return {};
  }

  return {
    source: library.source,
    category: isCategory.value ? String(selection.value.selectedId) : undefined,
    keyword: isSearch.value ? keyword.value : undefined,
  };
});
</script>
