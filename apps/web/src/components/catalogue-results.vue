<template>
  <div :aria-busy="status === 'loading' || loading">
    <MovieGridSkeleton
      v-if="!movies.length && (loading || status === 'loading')"
    />
    <Empty
      v-else-if="!movies.length"
      :icon="PackageOpen"
      :label="error ? '影片加载失败' : emptyLabel"
      :description="error || '试试其他关键词，或切换播放源'"
      :action="error ? '重新加载' : undefined"
      class="min-h-80"
      @action="load(true)"
    />
    <template v-else>
      <div
        class="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-x-5 sm:gap-y-7"
      >
        <MovieCard v-for="movie in movies" :key="movie.id" :movie="movie" />
      </div>
      <div ref="loadMoreTarget" class="mt-10 flex min-h-9 justify-center">
        <Spinner v-if="status === 'loading'" class="size-5" />
        <Button
          v-else-if="error || page < pageCount"
          variant="outline"
          @click="load()"
        >
          <ArrowDown class="size-4" />
          {{ error ? '重新加载' : '加载更多' }}
        </Button>
        <p v-else class="text-xs text-muted-foreground">已经到底了</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { useIntersectionObserver } from '@vueuse/core';
import { ArrowDown, PackageOpen } from 'lucide-vue-next';
import { Button } from '@ym-video/ui/components/button';
import { Spinner } from '@ym-video/ui/components/spinner';
import Empty from '@ym-video/ui/common/empty.vue';
import MovieCard from '@/components/movie-card/index.vue';
import MovieGridSkeleton from '@/components/movie-grid-skeleton.vue';
import { useCatalogue } from '@/composables/use-catalogue';
import type { Source } from '@/types';

// 目录和搜索共用结果列表、请求取消与分页加载。
const props = withDefaults(
  defineProps<{
    source?: Source;
    category?: string;
    keyword?: string;
    active?: boolean;
    loading?: boolean;
    emptyLabel?: string;
  }>(),
  { active: true, loading: false, emptyLabel: '暂无影片' },
);

// 查询变化时复用目录请求的取消与重置行为。
const { movies, status, error, page, pageCount, load } = useCatalogue(() => ({
  source: props.source,
  category: props.category,
  keyword: props.keyword,
}));

// 列表底部同时作为滚动加载观察点和手动加载入口。
const loadMoreTarget = useTemplateRef<HTMLElement>('loadMoreTarget');

useIntersectionObserver(loadMoreTarget, ([entry]) => {
  if (
    props.active &&
    entry?.isIntersecting &&
    status.value !== 'loading' &&
    !error.value
  ) {
    return load();
  }
});
</script>
