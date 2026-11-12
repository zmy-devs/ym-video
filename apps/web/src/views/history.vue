<template>
  <PullRefresh
    class="flex h-full flex-col"
    :disabled="!isMobile || !active || !history.loaded"
    :refresh="handleSync"
  >
    <template
      v-if="
        history.loaded &&
        !history.entries.length &&
        history.syncStatus !== 'error'
      "
    >
      <h1
        v-if="!isMobile"
        class="mx-auto w-full max-w-[1400px] shrink-0 px-4 pt-8 text-2xl font-semibold sm:px-10"
      >
        历史
      </h1>
      <Empty
        :icon="PackageOpen"
        label="还没有观看记录"
        description="开始播放后，会在这里记住你的进度"
        class="min-h-0 flex-1"
        :class="isMobile && 'mobile-navigation-space'"
      />
    </template>
    <ScrollArea v-else class="min-h-0 flex-1" @scroll.capture="handleScroll">
      <div
        data-slot="catalogue-page"
        class="mx-auto w-full max-w-[1400px] px-4 sm:px-10 sm:py-8"
        :class="isMobile && 'mobile-navigation-space mt-4'"
      >
        <div
          v-if="!isMobile || history.syncStatus === 'error'"
          class="mb-8 flex items-center justify-between"
        >
          <h1 v-if="!isMobile" class="text-2xl font-semibold">历史</h1>
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
        <div v-else class="space-y-10">
          <section v-for="group in groups" :key="group.label">
            <h2 class="mb-5 text-lg font-semibold">{{ group.label }}</h2>
            <div
              class="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-x-5 sm:gap-y-7"
            >
              <MovieCard
                v-for="entry in group.entries"
                :key="entry.id"
                :movie="entry"
                :entry="entry"
                mobile-actions
                @long-press="handleLongPress(entry)"
              />
            </div>
          </section>
        </div>
      </div>
    </ScrollArea>
    <HistoryActionDrawer v-model:open="actionOpen" :entry="selectedEntry" />
  </PullRefresh>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useNow } from '@vueuse/core';
import { History, PackageOpen, RefreshCw } from 'lucide-vue-next';
import { ScrollArea } from '@ym-video/ui/components/scroll-area';
import { Button } from '@ym-video/ui/components/button';
import MovieCard from '@/components/movie-card/index.vue';
import MovieGridSkeleton from '@/components/movie-grid-skeleton.vue';
import HistoryActionDrawer from '@/components/history-action-drawer.vue';
import PullRefresh from '@/components/pull-refresh.vue';
import { useHistoryStore } from '@/stores/history-store';
import { groupHistory } from '@/lib/history';
import Empty from '@ym-video/ui/common/empty.vue';
import { isMobile } from '@/platform';
import type { HistoryEntry } from '@/types';
import { useCachedScroll } from '@/composables/use-cached-scroll';

// 切换页面后恢复观看历史的滚动位置。
const { active, handleScroll } = useCachedScroll();

// 历史页展示当前登录账号的云端记录与同步状态。
const history = useHistoryStore();

// 跨日后自动按当前本地日期更新分组。
const now = useNow({ interval: 60_000 });

// 仅展示有观看记录的日期分组。
const groups = computed(() => groupHistory(history.entries, now.value));

// 重试期间禁用按钮，避免重复发起刷新。
const syncing = ref(false);

// 当前长按打开操作抽屉的历史记录。
const selectedEntry = ref<HistoryEntry | null>(null);
const actionOpen = ref(false);

// 失败详情继续留在页面，用户可再次重试。
const handleSync = async () => {
  syncing.value = true;
  try {
    await history.refresh();
  } finally {
    syncing.value = false;
  }
};

// 移动端长按卡片后显示对应记录的操作抽屉。
const handleLongPress = (entry: HistoryEntry) => {
  if (!isMobile) {
    return;
  }

  selectedEntry.value = entry;
  actionOpen.value = true;
};

watch(actionOpen, (open) => {
  if (!open) {
    selectedEntry.value = null;
  }
});
</script>
