<template>
  <div
    v-if="props.mobileActions && isMobile && entry"
    ref="card"
    class="min-w-0"
    @click.capture="handleLongPressClick"
    @contextmenu.prevent
    @pointerdown="handlePressStart"
    @pointercancel="longPressCancelled = true"
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
import { computed, ref, useTemplateRef } from 'vue';
import { onLongPress } from '@vueuse/core';
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

// 移动卡片作为 VueUse 长按监听目标。
const card = useTemplateRef('card');
// 长按产生的下一次链接点击由卡片拦截。
let longPressTriggered = false;
// 系统滚动取消触点后丢弃尚未触发的长按。
const longPressCancelled = ref(false);

// 新触点重新开始本轮长按判定。
const handlePressStart = () => {
  longPressTriggered = false;
  longPressCancelled.value = false;
};

// 移动容差与计时由 VueUse 管理，滚动超过 10px 自动取消。
onLongPress(
  card,
  (event) => {
    if (event.button === 0 && !longPressCancelled.value) {
      longPressTriggered = true;
      emits('long-press');
    }
  },
  { delay: 450, distanceThreshold: 10 },
);

// 长按后阻止随后产生的链接点击，普通点击仍进入播放器。
const handleLongPressClick = (event: MouseEvent) => {
  if (!longPressTriggered) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  longPressTriggered = false;
};
</script>
