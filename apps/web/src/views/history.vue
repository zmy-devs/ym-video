<template>
  <ScrollArea class="h-full">
    <div class="page-content">
      <div class="mb-8 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold">观看历史</h1>
          <p
            class="mt-2 text-sm text-muted-foreground"
            :title="history.syncError"
          >
            {{ history.entries.length }} 部影片 · {{ statusLabel }}
          </p>
        </div>
        <Button
          v-if="history.syncStatus === 'error'"
          type="button"
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
        class="empty-state"
      >
        <History class="size-10" />
        <h2 class="text-base text-foreground">无法读取云端观看历史</h2>
        <p>{{ history.syncError }}</p>
      </div>
      <div v-else-if="!history.entries.length" class="empty-state">
        <History class="size-10" />
        <h2 class="text-base text-foreground">还没有观看记录</h2>
        <p>开始播放后，会在这里记住你的进度</p>
        <Button as-child variant="outline"
          ><RouterLink to="/overview">去找一部影片</RouterLink></Button
        >
      </div>
      <div v-else class="space-y-10">
        <section v-for="group in groups" :key="group.label">
          <h2 class="mb-5 text-lg font-semibold">{{ group.label }}</h2>
          <div class="movie-grid">
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import MovieCard from '@/components/movie-card.vue';
import MovieGridSkeleton from '@/components/movie-grid-skeleton.vue';
import { useHistoryStore } from '@/stores/history';
import { groupHistory } from '@/lib/history';

// 历史页展示当前登录账号的云端记录与同步状态。
const history = useHistoryStore();

// 跨日后自动按当前本地日期更新分组。
const now = useNow({ interval: 60_000 });

// 仅展示有观看记录的日期分组。
const groups = computed(() => groupHistory(history.entries, now.value));

// 重试期间禁用按钮，避免重复发起刷新。
const syncing = ref(false);

// 列表明确区分云端已确认与仍在本机的记录。
const statusLabel = computed(() => {
  if (history.syncStatus === 'error') {
    return '同步失败';
  }
  if (history.syncStatus === 'pending') {
    return '待同步';
  }
  return '已同步';
});

// 失败详情继续留在页面，用户可再次重试。
const handleSync = async () => {
  syncing.value = true;
  try {
    await history.retry();
  } finally {
    syncing.value = false;
  }
};
</script>
