<template>
  <ScrollArea class="h-full">
    <div class="page-content">
      <h1
        v-if="isOverview"
        class="mb-10 text-center text-3xl font-semibold tracking-tight"
      >
        {{ greeting }}，亲爱的用户<span class="ml-2" aria-hidden="true"
          >😊</span
        >
      </h1>
      <section
        v-if="isOverview && history.sorted.length"
        class="mb-10"
        aria-labelledby="continue-heading"
      >
        <h2 id="continue-heading" class="mb-5 text-xl font-semibold">
          最近观看
        </h2>
        <div class="movie-grid">
          <MovieCard
            v-for="item in history.sorted.slice(0, 6)"
            :key="item.id"
            :movie="item"
            :entry="item"
          />
        </div>
      </section>
      <section aria-labelledby="catalogue-heading">
        <h2
          v-if="isOverview"
          id="catalogue-heading"
          class="mb-5 text-xl font-semibold"
        >
          {{ title }}
        </h2>
        <h1
          v-else
          id="catalogue-heading"
          class="mb-6 text-2xl font-semibold tracking-tight"
        >
          {{ title }}
        </h1>
        <div
          v-if="hasFilters"
          class="mb-6 flex gap-2 overflow-x-auto"
          role="group"
          aria-label="影视分类"
        >
          <Button
            v-for="item in selection.children"
            :key="item.id"
            type="button"
            size="sm"
            :variant="selection.selectedId === item.id ? 'default' : 'outline'"
            :aria-pressed="selection.selectedId === item.id"
            @click="handleCategoryChange(item.id)"
          >
            {{ item.name }}
          </Button>
        </div>
        <div :key="selection.selectedId">
          <MovieGridSkeleton
            v-if="
              (library.loading || library.categoryLoading || loading) &&
              !movies.length
            "
          />
          <div v-else-if="!movies.length && !error" class="empty-state">
            <SearchX class="size-10" />
            <h2 class="text-base text-foreground">
              {{ isSearch ? '没有找到相关影片' : '暂无影片' }}
            </h2>
            <p>试试其他关键词，或切换资源源</p>
          </div>
          <div v-else class="movie-grid">
            <MovieCard v-for="movie in movies" :key="movie.id" :movie="movie" />
          </div>
          <div
            v-if="error"
            role="alert"
            class="my-10 flex flex-col items-center gap-3"
          >
            <p class="text-sm text-muted-foreground">{{ error }}</p>
            <Button variant="outline" @click="load(page === 0)"
              >重新加载</Button
            >
          </div>
          <div
            v-else-if="movies.length"
            ref="loadMoreTarget"
            class="mt-10 flex min-h-9 justify-center"
          >
            <Spinner
              v-if="loading"
              class="size-5"
              aria-label="正在加载更多影片"
            />
            <Button
              v-else-if="page < pageCount"
              variant="outline"
              @click="load()"
              ><ArrowDown class="size-4" />加载更多</Button
            >
            <p v-else class="text-xs text-muted-foreground">已经到底了</p>
          </div>
        </div>
      </section>
    </div>
  </ScrollArea>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useIntersectionObserver, useNow } from '@vueuse/core';
import { useRoute, useRouter } from 'vue-router';
import { ArrowDown, SearchX } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ScrollArea } from '@/components/ui/scroll-area';
import MovieCard from '@/components/movie-card.vue';
import MovieGridSkeleton from '@/components/movie-grid-skeleton.vue';
import { useLibraryStore } from '@/stores/library';
import { useHistoryStore } from '@/stores/history';
import { useCatalogue } from '@/composables/use-catalogue';
import { getCategorySelection } from '@/lib/category';

// 概览、分类与搜索沿用统一海报列表布局。
const route = useRoute();

// 页面导航与返回操作。
const router = useRouter();

// 可用资源源及分类状态。
const library = useLibraryStore();

// 当前浏览器的观看历史。
const history = useHistoryStore();

// 当前是否展示概览。
const isOverview = computed(() => route.path === '/overview');

// 每分钟更新本地时间，页面保持打开时也会切换问候。
const now = useNow({ interval: 60_000 });

// 根据用户所在时区区分早上、中午、下午和晚上。
const greeting = computed(() => {
  // 当前本地小时。
  const hour = now.value.getHours();

  if (hour < 5 || hour >= 18) {
    return '晚上好';
  }

  if (hour < 11) {
    return '早上好';
  }

  if (hour < 14) {
    return '中午好';
  }

  return '下午好';
});

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

// 页面使用的业务状态和操作。
const { movies, loading, error, page, pageCount, load } = useCatalogue(() => {
  if (
    !library.source ||
    (isSearch.value && !keyword.value) ||
    (isCategory.value && !selection.value.selectedId)
  ) {
    return { sourceId: '' };
  }

  return {
    sourceId: library.selected,
    category: isCategory.value ? String(selection.value.selectedId) : undefined,
    keyword: isSearch.value ? keyword.value : undefined,
  };
});

// 列表底部同时作为滚动加载观察点和手动加载入口。
const loadMoreTarget = ref<HTMLElement | null>(null);

useIntersectionObserver(loadMoreTarget, ([entry]) => {
  if (entry?.isIntersecting && !loading.value && !error.value) {
    return load();
  }
});
</script>
