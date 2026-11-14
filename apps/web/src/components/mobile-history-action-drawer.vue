<template>
  <Drawer v-model:open="open">
    <template v-if="entry" #header>
      <DrawerTitle class="sr-only">历史记录操作</DrawerTitle>
      <DrawerDescription class="sr-only">
        选择对当前观看记录的操作
      </DrawerDescription>
      <div class="flex min-w-0 items-center gap-3">
        <MoviePoster :src="entry.pic" class="size-14 shrink-0 rounded-xl" />
        <div class="min-w-0">
          <p class="truncate text-base font-semibold">{{ entry.name }}</p>
          <p class="mt-1 truncate text-sm text-muted-foreground">
            {{ description }}
          </p>
        </div>
      </div>
    </template>

    <div v-if="entry" class="mx-auto w-full max-w-lg pb-4">
      <ButtonGroup class="mx-4 w-auto">
        <ButtonGroupItem as-child class="justify-start">
          <RouterLink :to="playerPath(entry)" @click="close">
            <Play class="size-5 text-foreground" />
            <span>继续播放</span>
          </RouterLink>
        </ButtonGroupItem>
        <ButtonGroupItem as-child class="justify-start">
          <RouterLink
            :to="{ path: playerPath(entry), query: { restart: '1' } }"
            @click="close"
          >
            <RotateCcw class="size-5 text-foreground" />
            <span>本集从头播放</span>
          </RouterLink>
        </ButtonGroupItem>
        <ButtonGroupItem
          class="justify-start text-left text-destructive hover:text-destructive"
          @click="remove"
        >
          <Trash2 class="size-5" />
          <span>删除</span>
        </ButtonGroupItem>
      </ButtonGroup>
    </div>
  </Drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { Play, RotateCcw, Trash2 } from 'lucide-vue-next';
import { DrawerDescription, DrawerTitle } from '@ym-video/ui/components/drawer';
import ButtonGroup from '@ym-video/ui/common/button-group.vue';
import ButtonGroupItem from '@ym-video/ui/common/button-group-item.vue';
import MoviePoster from './movie-card/poster.vue';
import Drawer from '@ym-video/ui/common/drawer.vue';
import { useMobileDrawer } from '@/composables/use-mobile-drawer';
import { playerPath } from '@/utils/movie';
import { useHistoryStore } from '@/stores/history-store';
import { useLibraryStore } from '@/stores/library-store';
import type { HistoryEntry } from '@/types';

const props = defineProps<{
  open: boolean;
  entry: HistoryEntry | null;
}>();

const emits = defineEmits<{
  'update:open': [open: boolean];
}>();

const history = useHistoryStore();
const library = useLibraryStore();

const open = computed({
  get: () => props.open,
  set: (value: boolean) => emits('update:open', value),
});

useMobileDrawer(open);

const episodeLabel = computed(
  () => props.entry?.episodes[props.entry.episode]?.label || '第 1 集',
);

// Drawer 描述与历史卡片保持同一集数、进度和播放源格式。
const description = computed(() => {
  const entry = props.entry;
  if (!entry) {
    return '';
  }

  const current = entry.progress[String(entry.episode)];
  const duration = current?.duration ?? 0;
  const percentage = duration
    ? Math.min(
        100,
        Math.max(0, Math.floor(((current?.currentTime ?? 0) / duration) * 100)),
      )
    : 0;
  const progressLabel = percentage ? `观看至${percentage}%` : '未观看';
  const sourceName =
    library.sources.find((source) => source.id === entry.sourceId)?.name ||
    '未知播放源';

  return `${episodeLabel.value} · ${progressLabel} · ${sourceName}`;
});

// 操作后关闭抽屉，避免路由切换或列表更新时保留旧目标。
const close = () => emits('update:open', false);

// 删除当前记录并关闭抽屉。
const remove = async () => {
  if (!props.entry) {
    return;
  }

  close();
  await history.remove(props.entry.id);
};
</script>
