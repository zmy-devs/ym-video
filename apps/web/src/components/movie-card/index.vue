<template>
  <div
    v-if="props.mobileActions && isMobile && entry"
    class="min-w-0"
    @click.capture="handleLongPressClick"
    @contextmenu.prevent
    @pointercancel="cancelLongPress"
    @pointerdown="startLongPress"
    @pointerleave="cancelLongPress"
    @pointermove="handleLongPressMove"
    @pointerup="finishLongPress"
  >
    <MovieCardContent
      :movie="movie"
      :entry="entry"
      :source-name="sourceName"
      class="transition-transform duration-150 ease-out"
    />
  </div>
  <ContextMenu v-else>
    <ContextMenuTrigger as-child :disabled="!entry">
      <MovieCardContent
        :movie="movie"
        :entry="entry"
        :source-name="sourceName"
        class="transition-transform duration-150 ease-out hover:z-10 hover:scale-110"
      />
    </ContextMenuTrigger>
    <HistoryMenuContent v-if="entry" :entry="entry" />
  </ContextMenu>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue';
import {
  ContextMenu,
  ContextMenuTrigger,
} from '@ym-video/ui/components/context-menu';
import HistoryMenuContent from '@/components/history-menu-content.vue';
import MovieCardContent from './content.vue';
import type { Movie, HistoryEntry } from '@/types';
import { useLibraryStore } from '@/stores/library-store';
import { isMobile } from '@/platform';

// 影片卡片保留桌面端海报与进度。
const props = defineProps<{
  movie: Movie;
  entry?: HistoryEntry;
  mobileActions?: boolean;
}>();

const emits = defineEmits<{
  'long-press': [];
}>();

// 根据影片所属源显示名称，不随当前选择的播放源变化。
const library = useLibraryStore();

// 旧记录所属源已下架时保留明确的源缺失提示。
const sourceName = computed(
  () =>
    library.sources.find((source) => source.id === props.movie.sourceId)
      ?.name || '未知播放源',
);

let longPressTimer: number | undefined;
let longPressStart: { x: number; y: number } | undefined;
let longPressTriggered = false;

// 清理长按计时器，手指移动或离开卡片时取消触发。
const cancelLongPress = () => {
  if (longPressTimer !== undefined) {
    window.clearTimeout(longPressTimer);
    longPressTimer = undefined;
  }
  longPressStart = undefined;
};

// 释放触点后给链接点击一次机会，再清除长按标记。
const finishLongPress = () => {
  cancelLongPress();
  if (longPressTriggered) {
    window.setTimeout(() => {
      longPressTriggered = false;
    }, 300);
  }
};

// 移动端按住卡片一段时间后打开操作抽屉。
const startLongPress = (event: PointerEvent) => {
  if (event.button !== 0) {
    return;
  }

  cancelLongPress();
  longPressTriggered = false;
  longPressStart = { x: event.clientX, y: event.clientY };
  longPressTimer = window.setTimeout(() => {
    longPressTriggered = true;
    emits('long-press');
  }, 450);
};

// 保持滚动手势自然可用，移动距离超过阈值后取消长按。
const handleLongPressMove = (event: PointerEvent) => {
  if (!longPressStart) {
    return;
  }

  if (
    Math.hypot(
      event.clientX - longPressStart.x,
      event.clientY - longPressStart.y,
    ) > 10
  ) {
    cancelLongPress();
  }
};

// 长按后阻止随后产生的链接点击，普通点击仍进入播放器。
const handleLongPressClick = (event: MouseEvent) => {
  if (!longPressTriggered) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  longPressTriggered = false;
};

onBeforeUnmount(cancelLongPress);
</script>
