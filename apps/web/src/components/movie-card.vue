<template>
  <ContextMenu>
    <ContextMenuTrigger as-child :disabled="!entry">
      <article
        ref="card"
        class="group relative min-w-0"
        @pointerenter="handleOpenPreview"
        @pointerleave="handleClosePreview"
        @focusin="handleOpenPreview"
        @focusout="handleClosePreview"
      >
        <RouterLink
          :to="playerPath(movie)"
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
      </article>
    </ContextMenuTrigger>
    <HistoryMenuContent v-if="entry" :entry="entry" />
  </ContextMenu>
  <!-- 卡片与预览各用一个菜单根节点，避免同时注册的锚点覆盖右键坐标。 -->
  <Teleport to="body">
    <ContextMenu v-if="previewVisible" v-model:open="previewMenuOpen">
      <ContextMenuTrigger as-child :disabled="!entry">
        <div
          ref="preview"
          data-slot="movie-preview"
          class="fixed z-40 flex w-80 -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-xl animate-in fade-in-0 zoom-in-95 duration-150 motion-reduce:animate-none"
          :style="previewStyle"
          @pointerleave="handleClosePreview"
          @focusout="handleClosePreview"
          @click="previewOpen = false"
          @wheel="handlePreviewWheel"
        >
          <RouterLink
            :to="playerPath(movie)"
            :aria-label="`播放 ${movie.name}`"
            :tabindex="-1"
            class="flex flex-1 flex-col outline-none"
          >
            <MoviePoster
              :src="movie.pic"
              :alt="`${movie.name}海报`"
              class="h-64 w-full grow shrink-0"
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
        </div>
      </ContextMenuTrigger>
      <HistoryMenuContent v-if="entry" :entry="entry" />
    </ContextMenu>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onDeactivated, ref } from 'vue';
import { useEventListener } from '@vueuse/core';
import { RouterLink } from 'vue-router';
import { Server } from 'lucide-vue-next';
import { ContextMenu, ContextMenuTrigger } from '@/components/ui/context-menu';
import HistoryMenuContent from '@/components/common/history-menu-content.vue';
import MoviePoster from '@/components/movie-poster.vue';
import { Progress } from '@/components/ui/progress';
import type { Movie, HistoryEntry } from '@/types';
import { formatRemarks, playerPath } from '@/lib/movie';
import { useLibraryStore } from '@/stores/library';

// 影片卡片保留桌面端海报与进度。
const props = defineProps<{ movie: Movie; entry?: HistoryEntry }>();

// 只在悬停或键盘聚焦时挂载预览，避免为全部卡片创建浮层。
const previewOpen = ref(false);

// 菜单接管焦点后保留其触发浮层，直到菜单关闭。
const previewMenuOpen = ref(false);

// 悬停和菜单状态共同决定浮层是否仍需挂载。
const previewVisible = computed(
  () => previewOpen.value || previewMenuOpen.value,
);

// 卡片与浮层的真实节点用于判断指针是否仍在同一张影片卡片内。
const card = ref<HTMLElement | null>(null);
const preview = ref<HTMLElement | null>(null);

// 浮层沿用卡片中心及外扩尺寸，位置相对于窗口计算。
const previewStyle = ref({
  left: '0px',
  top: '0px',
  minWidth: '',
  minHeight: '',
});

// 仅可见浮层跟随列表滚动及窗口大小变化。
const updatePreviewPosition = () => {
  if (!card.value) {
    return;
  }

  // 原卡片在窗口内的位置与尺寸。
  const rect = card.value.getBoundingClientRect();

  previewStyle.value = {
    left: `${rect.left + rect.width / 2}px`,
    top: `${rect.top + rect.height / 2}px`,
    minWidth: `${rect.width + 32}px`,
    minHeight: `${rect.height + 32}px`,
  };
};

// 悬停与键盘聚焦共用同一个影片预览。
const handleOpenPreview = () => {
  updatePreviewPosition();
  previewOpen.value = true;
};

// 指针从卡片移到独立浮层时保持预览，离开两者后关闭。
const handleClosePreview = (event: PointerEvent | FocusEvent) => {
  if (
    event.relatedTarget instanceof Node &&
    (card.value?.contains(event.relatedTarget) ||
      preview.value?.contains(event.relatedTarget))
  ) {
    return;
  }

  previewOpen.value = false;
};

// 独立浮层不在列表滚动链中，将滚轮交给原卡片所在的列表。
const handlePreviewWheel = (event: WheelEvent) => {
  // 按原卡片查找列表，避免误滚侧栏或其他页面。
  const viewport = card.value?.closest<HTMLElement>(
    '[data-slot="scroll-area-viewport"]',
  );

  // Ctrl + 滚轮保留浏览器缩放行为。
  if (!viewport || event.ctrlKey) {
    return;
  }

  event.preventDefault();

  // 浏览器的滚轮增量可能使用像素、行或整页。
  let unit = 1;

  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    unit = 16;
  } else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    unit = viewport.clientHeight;
  }

  viewport.scrollBy({
    left: event.deltaX * unit,
    top: event.deltaY * unit,
    behavior: 'instant',
  });
};

// 仅展开的卡片注册全局监听，页面缓存时关闭其独立浮层。
const previewWindow = computed(() => (previewVisible.value ? window : null));

useEventListener(previewWindow, 'scroll', updatePreviewPosition, {
  capture: true,
});
useEventListener(previewWindow, 'resize', updatePreviewPosition);
useEventListener(previewWindow, 'keydown', (event) => {
  if (event instanceof KeyboardEvent && event.key === 'Escape') {
    previewOpen.value = false;
    previewMenuOpen.value = false;
  }
});

onDeactivated(() => {
  previewOpen.value = false;
  previewMenuOpen.value = false;
});

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
