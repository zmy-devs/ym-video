<template>
  <ScrollArea class="h-full">
    <div
      data-slot="catalogue-page"
      class="mx-auto w-full max-w-[1400px] px-10 py-8"
    >
      <div class="mb-8 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold">观看历史</h1>
          <Tooltip :label="history.syncError" side="top">
            <p class="mt-2 text-sm text-muted-foreground">
              {{ history.entries.length }} 部影片 · {{ statusLabel }}
            </p>
          </Tooltip>
        </div>
        <Button
          v-if="history.syncStatus === 'error'"
          variant="default"
          :disabled="syncing"
          @click="handleSync"
        >
          <RefreshCw class="size-4" />同步
        </Button>
      </div>
      <MovieGridSkeleton v-if="!history.loaded" />
      <div
        v-else-if="history.syncStatus === 'error' && !history.entries.length"
        class="min-h-80 flex flex-col items-center justify-center gap-4 text-sm text-muted-foreground"
      >
        <History class="size-10" />
        <h2 class="text-base">无法读取云端观看历史</h2>
        <p>{{ history.syncError }}</p>
      </div>
      <div
        v-else-if="!history.entries.length"
        class="min-h-80 flex flex-col items-center justify-center gap-4 text-sm text-muted-foreground"
      >
        <History class="size-10" />
        <h2 class="text-base">还没有观看记录</h2>
        <p>开始播放后，会在这里记住你的进度</p>
        <Button as-child variant="outline"
          ><RouterLink to="/overview">去找一部影片</RouterLink></Button
        >
      </div>
      <div v-else class="space-y-10">
        <section v-for="group in groups" :key="group.label">
          <h2 class="mb-5 text-lg font-semibold">{{ group.label }}</h2>
          <div
            class="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-5 gap-y-7"
          >
            <MovieCard
              v-for="entry in group.entries"
              :key="entry.id"
              :movie="entry"
              :entry="entry"
            />
          </div>
        </section>
      </div>
    </div>
  </ScrollArea>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useNow } from '@vueuse/core';
import { RouterLink } from 'vue-router';
import { History, RefreshCw } from 'lucide-vue-next';
import { ScrollArea } from '@ym-video/ui/components/scroll-area';
import { Button } from '@ym-video/ui/components/button';
import MovieCard from '@/components/movie-card/index.vue';
import MovieGridSkeleton from '@/components/movie-grid-skeleton.vue';
import { useHistoryStore } from '@/stores/history-store';
import { groupHistory } from '@/lib/history';
import { HISTORY_STATUS_MESSAGE_MAP } from '@/map';
import Tooltip from '@ym-video/ui/common/tooltip.vue';

// 历史页展示当前登录账号的云端记录与同步状态。
const history = useHistoryStore();

// 跨日后自动按当前本地日期更新分组。
const now = useNow({ interval: 60_000 });

// 仅展示有观看记录的日期分组。
const groups = computed(() => groupHistory(history.entries, now.value));

// 重试期间禁用按钮，避免重复发起刷新。
const syncing = ref(false);

// 列表明确区分云端已确认与仍在本机的记录。
const statusLabel = computed(
  () => HISTORY_STATUS_MESSAGE_MAP[history.syncStatus],
);

// 失败详情继续留在页面，用户可再次重试。
const handleSync = async () => {
  syncing.value = true;
  try {
    await history.refresh();
  } finally {
    syncing.value = false;
  }
};
</script>
