<template>
  <div
    v-if="props.mobileActions && isMobile && entry"
    ref="card"
    class="min-w-0"
    @contextmenu.prevent
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
import { computed, useTemplateRef } from 'vue';
import { useLongPress } from '@/composables/use-long-press';
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
const card = useTemplateRef<HTMLElement>('card');
useLongPress(card, () => emits('long-press'));
</script>
