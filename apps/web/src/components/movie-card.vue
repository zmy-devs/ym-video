<template>
  <ContextMenu>
    <ContextMenuTrigger as-child :disabled="!entry">
      <article class="group relative min-w-0 hover:z-40 focus-within:z-40">
        <RouterLink
          :to="playerPath(movie)"
          target="_blank"
          rel="noopener"
          class="block rounded-lg"
          :aria-label="`播放 ${movie.name}`"
        >
          <div
            class="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted"
          >
            <MoviePoster
              :src="movie.pic"
              :alt="`${movie.name}海报`"
              class="size-full"
            />
            <div
              aria-hidden="true"
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
              :aria-label="`${movie.name}观看进度`"
              class="absolute inset-x-0 bottom-0 h-1 bg-transparent [&_[data-slot=progress-indicator]]:rounded-full [&_[data-slot=progress-indicator]]:bg-white"
            />
          </div>
          <h3 class="mt-3 truncate text-sm font-medium group-hover:text-link">
            {{ movie.name }}
          </h3>
          <p class="mt-1 truncate text-xs text-muted-foreground">
            {{
              entry
                ? historyLabel
                : [year, movie.area, movie.category]
                    .filter(Boolean)
                    .join(' · ') || '暂无影片信息'
            }}
          </p>
        </RouterLink>
        <!-- 与桌面端一致，预览留在原卡片内，跟随列表原生滚动。 -->
        <RouterLink
          :to="playerPath(movie)"
          target="_blank"
          rel="noopener"
          :aria-label="`播放 ${movie.name}`"
          :tabindex="-1"
          data-slot="movie-preview"
          class="pointer-events-none invisible absolute top-1/2 left-1/2 z-40 block w-[280px] -translate-x-1/2 -translate-y-1/2 scale-0 overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-xl outline-none transition-[scale,visibility] duration-150 ease-out group-hover:pointer-events-auto group-hover:visible group-hover:scale-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:scale-100 motion-reduce:transition-none"
        >
          <MoviePoster
            :src="movie.pic"
            :alt="`${movie.name}海报`"
            class="h-56 w-full"
          />
          <!-- 沿用桌面端正文同色的模糊阴影，让海报自然衔接正文。 -->
          <div
            class="relative flex flex-col gap-2 bg-popover px-4 py-3 shadow-[0_0_8px_8px_var(--popover)]"
          >
            <h3 class="line-clamp-2 text-lg font-semibold">
              {{ movie.name }}
            </h3>
            <template v-if="entry">
              <p class="text-sm text-muted-foreground">
                {{ historyLabel }}
              </p>
              <div
                class="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Server class="size-4 shrink-0" />
                <span class="truncate">{{ sourceName }}</span>
                <time
                  v-if="watchedAt"
                  :datetime="watchedAt.toISOString()"
                  :title="watchedAt.toLocaleString('zh-CN')"
                  class="shrink-0"
                  >{{ watchedTime }}</time
                >
              </div>
            </template>
            <template v-else>
              <p v-if="metadata" class="text-sm text-muted-foreground">
                {{ metadata }}
              </p>
              <p
                class="line-clamp-3 text-sm leading-relaxed text-muted-foreground"
              >
                “{{ movie.content || '暂无简介，敬请期待' }}”
              </p>
            </template>
          </div>
        </RouterLink>
      </article>
    </ContextMenuTrigger>
    <HistoryMenuContent v-if="entry" :entry="entry" />
  </ContextMenu>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { Server } from 'lucide-vue-next';
import { ContextMenu, ContextMenuTrigger } from '@/components/ui/context-menu';
import HistoryMenuContent from '@/components/common/history-menu-content.vue';
import MoviePoster from '@/components/movie-poster.vue';
import { Progress } from '@/components/ui/progress';
import type { Movie, HistoryEntry } from '@/types';
import { formatRemarks, playerPath } from '@/lib/movie';
import { useLibraryStore } from '@/stores/library';

// 影片卡片保留桌面端海报与进度，所有播放入口在新标签页打开。
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

// 悬浮预览只显示地区和语言。
const metadata = computed(() =>
  [props.movie.area, props.movie.lang].filter(Boolean).join(' | '),
);

// 当前操作对应的数据快照。
const current = computed(
  () => props.entry?.progress[String(props.entry.episode)],
);

// 当前集的播放进度百分比。
const percentage = computed(() => {
  if (!current.value || current.value.duration <= 0) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, (current.value.currentTime / current.value.duration) * 100),
  );
});

// 卡片与悬浮预览共用当前集名称和观看比例。
const historyLabel = computed(() => {
  // 未记录时长时沿用桌面端的未观看提示。
  const progressLabel =
    percentage.value > 0 ? `观看至${Math.floor(percentage.value)}%` : '未观看';

  return `${props.movie.episodes[props.entry?.episode ?? 0]?.label || '第 1 集'} · ${progressLabel}`;
});

// 旧记录所属源已下架时保留明确的源缺失提示。
const sourceName = computed(
  () =>
    library.sources.find((source) => source.id === props.movie.sourceId)
      ?.name || '未知播放源',
);

// 校验最后观看时间，避免无效日期中断卡片渲染。
const watchedAt = computed(() => {
  if (!props.entry) {
    return null;
  }

  // IndexedDB 中记录的最后观看时间。
  const date = new Date(props.entry.watchedAt);

  return Number.isFinite(date.getTime()) ? date : null;
});

// 采用截图中的星期与二十四小时制时间。
const watchedTime = computed(() => {
  if (!watchedAt.value) {
    return '';
  }

  // 星期与时间之间保留空格，便于快速辨认。
  const weekday = watchedAt.value.toLocaleDateString('zh-CN', {
    weekday: 'short',
  });

  // 仅显示最后观看的小时和分钟。
  const time = watchedAt.value.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return `${weekday} ${time}`;
});
</script>
