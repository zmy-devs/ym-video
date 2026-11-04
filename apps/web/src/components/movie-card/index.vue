<template>
  <ContextMenu>
    <ContextMenuTrigger as-child :disabled="!entry">
      <article
        class="group relative min-w-0 transition-transform duration-150 ease-out hover:z-10 hover:scale-110"
      >
        <RouterLink :to="playerPath(movie)" class="block rounded-lg">
          <div
            class="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted"
          >
            <MoviePoster
              :src="movie.pic"
              :alt="`${movie.name}海报`"
              class="size-full"
            />
            <div
              class="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.7),transparent_20%,transparent_80%,rgba(0,0,0,0.7))]"
            />
            <span
              v-if="year"
              data-slot="movie-year"
              class="absolute top-2 left-2 text-xs text-white [text-shadow:0_1px_1px_#191919]"
              >{{ year }}</span
            >
            <span
              v-if="remarks"
              data-slot="movie-remarks"
              class="absolute right-2 bottom-2 left-2 truncate text-right text-xs text-white [text-shadow:0_1px_1px_#191919]"
              >{{ remarks }}</span
            >
            <Progress
              v-if="entry"
              :model-value="percentage"
              class="absolute inset-x-0 bottom-0 h-1 bg-transparent [&_[data-slot=progress-indicator]]:rounded-full [&_[data-slot=progress-indicator]]:bg-white"
            />
          </div>
          <h3 class="mt-3 truncate text-sm font-medium group-hover:text-link">
            {{ movie.name }}
          </h3>
          <p class="mt-1 truncate text-xs text-muted-foreground">
            {{ subtitle }}
          </p>
        </RouterLink>
      </article>
    </ContextMenuTrigger>
    <HistoryMenuContent v-if="entry" :entry="entry" />
  </ContextMenu>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import {
  ContextMenu,
  ContextMenuTrigger,
} from '@ym-video/ui/components/context-menu';
import HistoryMenuContent from '@/components/history-menu-content.vue';
import MoviePoster from '@/components/movie-card/poster.vue';
import { Progress } from '@ym-video/ui/components/progress';
import type { Movie, HistoryEntry } from '@/types';
import { formatRemarks, playerPath } from '@/lib/movie';
import { getProgress } from '@/utils/progress';
import { useLibraryStore } from '@/stores/library-store';

// 影片卡片保留桌面端海报与进度。
const props = defineProps<{ movie: Movie; entry?: HistoryEntry }>();

// 根据影片所属源显示名称，不随当前选择的播放源变化。
const library = useLibraryStore();

// 年份为零或缺失时不显示角标和副标题。
const year = computed(() => {
  // 上游年份可能包含前后空格。
  const value = props.movie.year.trim();
  return value && Number(value) !== 0 ? value : '';
});

// 与桌面端一致，右下角显示更新集数或格式化后的综艺期数。
const remarks = computed(() => formatRemarks(props.movie.remarks));

// 当前操作对应的数据快照。
const current = computed(
  () => props.entry?.progress[String(props.entry.episode)],
);

// 当前集的播放进度百分比。
const percentage = computed(() =>
  getProgress(current.value?.currentTime ?? 0, current.value?.duration ?? 0),
);

// 普通影片和历史影片分别提供对应的展示信息。
const subtitle = computed(() =>
  props.entry
    ? historyLabel.value
    : [year.value, props.movie.area, props.movie.category]
        .filter(Boolean)
        .join(' · ') || '暂无影片信息',
);

// 历史卡片副标题依次显示当前集、观看进度和播放源。
const historyLabel = computed(() => {
  // 未记录时长时沿用桌面端的未观看提示。
  const progressLabel =
    percentage.value > 0 ? `观看至${Math.floor(percentage.value)}%` : '未观看';

  return `${props.movie.episodes[props.entry?.episode ?? 0]?.label || '第 1 集'} · ${progressLabel} · ${sourceName.value}`;
});

// 旧记录所属源已下架时保留明确的源缺失提示。
const sourceName = computed(
  () =>
    library.sources.find((source) => source.id === props.movie.sourceId)
      ?.name || '未知播放源',
);
</script>
