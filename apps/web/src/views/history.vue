<template>
  <ScrollArea class="h-full">
    <div class="page-content">
      <div class="mb-8 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold">观看历史</h1>
          <div
            class="mt-2 flex items-center gap-3 text-sm text-muted-foreground"
          >
            <p :title="history.syncError">
              {{ statusLabel }} · {{ history.entries.length }} 部影片
            </p>
            <Button
              v-if="history.syncStatus === 'error'"
              variant="ghost"
              size="sm"
              :disabled="retrying"
              @click="handleRetry"
            >
              <RefreshCw class="size-4" />重试
            </Button>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          :disabled="!history.entries.length"
          @click="handleClear"
        >
          <Trash2 class="size-4" />清空历史
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
        <Button variant="outline" :disabled="retrying" @click="handleRetry">
          <RefreshCw class="size-4" />重试
        </Button>
      </div>
      <div v-else-if="!history.entries.length" class="empty-state">
        <History class="size-10" />
        <h2 class="text-base text-foreground">还没有观看记录</h2>
        <p>开始播放后，会在这里记住你的进度</p>
        <Button as-child variant="outline"
          ><RouterLink to="/overview">去找一部影片</RouterLink></Button
        >
      </div>
      <div v-else class="movie-grid">
        <MovieCard
          v-for="entry in history.entries"
          :key="entry.id"
          :movie="entry"
          :entry="entry"
        />
      </div>
    </div>
  </ScrollArea>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { History, RefreshCw, Trash2 } from 'lucide-vue-next';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import MovieCard from '@/components/movie-card.vue';
import MovieGridSkeleton from '@/components/movie-grid-skeleton.vue';
import { useHistoryStore } from '@/stores/history';
import { eventBus } from '@/utils/event-bus';

// 历史页展示当前登录账号的云端记录与同步状态。
const history = useHistoryStore();

// 重试期间禁用按钮，避免重复发起刷新。
const retrying = ref(false);

// 清空操作只通过根确认弹窗执行。
const handleClear = () => {
  eventBus.emit('confirm:show', {
    title: '清空观看历史？',
    description: '这会删除当前账号云端的全部观看记录和播放进度，无法恢复。',
    confirmText: '确认清空',
    onConfirm: () => history.clear(),
  });
};

// 列表明确区分云端已确认与仍在本机的记录。
const statusLabel = computed(() => {
  if (history.syncStatus === 'error') {
    return '同步失败，可重试';
  }
  if (history.syncStatus === 'pending') {
    return '待同步';
  }
  return '已同步';
});

// 失败详情继续留在页面，用户可再次重试。
const handleRetry = async () => {
  retrying.value = true;
  await history.retry();
  retrying.value = false;
};
</script>
