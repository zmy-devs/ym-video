<template>
  <article class="group relative min-w-0">
    <RouterLink
      :to="playerPath(movie)"
      class="block overflow-hidden rounded-lg focus-visible:outline-2 focus-visible:outline-ring"
    >
      <div class="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted">
        <MoviePoster :src="movie.pic" class="size-full" />
        <div
          class="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.7),transparent_20%,transparent_80%,rgba(0,0,0,0.7))]"
        />
        <span
          v-if="year"
          data-slot="movie-year"
          class="absolute top-2 left-2 text-xs text-white [text-shadow:0_1px_1px_#191919]"
        >
          {{ year }}
        </span>
        <span
          v-if="remarks"
          data-slot="movie-remarks"
          class="absolute right-2 bottom-2 left-2 truncate text-right text-xs text-white [text-shadow:0_1px_1px_#191919]"
        >
          {{ remarks }}
        </span>
        <Progress
          v-if="entry"
          :model-value="percentage"
          class="absolute inset-x-0 bottom-0 h-1 bg-transparent [&_[data-slot=progress-indicator]]:rounded-full [&_[data-slot=progress-indicator]]:bg-white"
        />
      </div>
      <h3 class="mt-3 truncate text-sm font-medium group-hover:text-link">
        {{ movie.name }}
      </h3>
      <p class="mt-1 truncate text-xs text-muted-foreground">{{ subtitle }}</p>
    </RouterLink>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import type { HistoryEntry } from '@ym-video/history';
import type { Movie } from '../../lib/movie.ts';
import { formatRemarks, playerPath } from '../../lib/movie.ts';
import MoviePoster from './poster.vue';
import { Progress } from '@ym-video/ui/components/progress';

// 影片卡片展示海报、元数据和当前观看进度。
const props = defineProps<{
  movie: Movie;
  entry?: HistoryEntry;
  sourceName?: string;
}>();

const year = computed(() => {
  const value = props.movie.year.trim();
  return value && Number(value) !== 0 ? value : '';
});

const remarks = computed(() => formatRemarks(props.movie.remarks));

const current = computed(
  () => props.entry?.progress[String(props.entry.episode)],
);

const percentage = computed(() => {
  const duration = current.value?.duration ?? 0;
  if (!duration) {
    return 0;
  }
  return Math.min(
    100,
    Math.max(
      0,
      Math.floor(((current.value?.currentTime ?? 0) / duration) * 100),
    ),
  );
});

const subtitle = computed(() => {
  if (props.entry) {
    const progressLabel = percentage.value
      ? `观看至${percentage.value}%`
      : '未观看';
    const episode =
      props.entry.episodes[props.entry.episode]?.label || '第 1 集';
    return `${episode} · ${progressLabel} · ${props.sourceName || '未知播放源'}`;
  }

  return (
    [year.value, props.movie.area, props.movie.category]
      .filter(Boolean)
      .join(' · ') || '暂无影片信息'
  );
});
</script>
