<template>
  <div ref="page" class="flex h-full flex-col bg-background dark:bg-black">
    <MobileHeader :scrolled="scrolled">
      <form
        role="search"
        class="min-w-0 flex-1"
        @submit.prevent="handleSearch(keyword)"
      >
        <InputGroup
          :focus-ring="false"
          class="h-11 rounded-full !bg-white/60 text-foreground backdrop-blur-xl dark:!bg-card/60"
        >
          <InputGroupInput
            id="search-keyword"
            v-model="keyword"
            type="text"
            role="searchbox"
            enterkeyhint="search"
            aria-label="搜索影片"
            placeholder="搜索影片"
            autocomplete="off"
            class="h-full rounded-full text-base"
          />
          <InputGroupAddon>
            <Search class="size-5 text-foreground" />
          </InputGroupAddon>
        </InputGroup>
      </form>
      <Button
        variant="outline"
        size="icon"
        class="size-11 rounded-full !bg-white/60 text-foreground backdrop-blur-xl hover:text-foreground dark:!bg-card/60"
        @click="handleClose"
      >
        <X class="size-5" />
      </Button>
    </MobileHeader>
    <ScrollArea class="min-h-0 flex-1" @scroll.capture="handleScroll">
      <div class="pb-mobile-safe-bottom flex flex-col px-4 pt-mobile-header">
        <CatalogueResults
          v-if="submitted"
          :key="submitted"
          :source="library.source"
          :keyword="submitted"
          :active="active"
          :loading="library.status === 'loading'"
          empty-label="没有找到相关影片"
          class="py-6"
        />
        <section v-else-if="recent.length" class="flex flex-col gap-2 py-2">
          <div class="flex items-center justify-between gap-3">
            <h2 id="search-history-heading" class="text-lg font-semibold">
              最近搜索
            </h2>
            <Button
              variant="ghost"
              size="icon"
              class="size-5 rounded-full text-muted-foreground"
              @click="handleClear"
            >
              <Trash2 class="size-5" />
            </Button>
          </div>
          <ul class="flex flex-wrap gap-2">
            <li v-for="item in recent" :key="item" class="max-w-full">
              <Badge
                as-child
                variant="secondary"
                class="min-w-12 max-w-full bg-accent px-3 py-1.5 hover:bg-accent/80"
              >
                <button type="button" @click="handleSearch(item)">
                  <span class="truncate">{{ item }}</span>
                </button>
              </Badge>
            </li>
          </ul>
        </section>
        <Empty
          v-else
          :icon="PackageOpen"
          label="暂无搜索历史"
          description="输入片名，开始搜索你想看的影片"
          class="flex-none"
          :style="{
            minHeight: `calc(${viewport.height}px - var(--mobile-header-height))`,
          }"
        />
      </div>
    </ScrollArea>
  </div>
</template>

<script setup lang="ts">
import { onActivated, onScopeDispose, ref, useTemplateRef, watch } from 'vue';
import { useEventListener } from '@vueuse/core';
import { useRouter } from 'vue-router';
import { PackageOpen, Search, Trash2, X } from 'lucide-vue-next';
import { Badge } from '@ym-video/ui/components/badge';
import { Button } from '@ym-video/ui/components/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@ym-video/ui/components/input-group';
import { ScrollArea } from '@ym-video/ui/components/scroll-area';
import Empty from '@ym-video/ui/common/empty.vue';
import CatalogueResults from '@/components/catalogue-results.vue';
import MobileHeader from '@/layout/mobile-header.vue';
import { useCachedScroll } from '@/composables/use-cached-scroll';
import { useSearchHistory } from '@/composables/use-search-history';
import { useLibraryStore } from '@/stores/library-store';
import { eventBus } from '@/utils/event-bus';

// 搜索页保留结果和滚动位置，播放后返回仍可继续搜索。
const { active, scrolled, handleScroll, resetScroll } = useCachedScroll();

// 搜索入口与结果使用当前播放源。
const library = useLibraryStore();

// 关闭搜索返回进入前的页面。
const router = useRouter();

// 当前输入和已提交的查询分开，编辑时保留上次结果。
const keyword = ref('');

// 本次结果列表使用的已提交关键词。
const submitted = ref('');

// 搜索历史与桌面入口共用同一份本地记录。
const { recent, remember, clear } = useSearchHistory();

// 页面元素用于聚焦输入框及重置结果滚动位置。
const page = useTemplateRef<HTMLDivElement>('page');

// 空状态沿用页面初始高度，底部安全区与软键盘变化只影响滚动区域。
const viewport = ref({
  width: window.innerWidth,
  height: window.innerHeight,
});

// 提交后在当前搜索框下展示结果，并收起软键盘。
const handleSearch = (value: string) => {
  // 去除输入首尾空格后执行查询。
  const query = value.trim();

  if (!query) {
    return;
  }

  keyword.value = query;
  submitted.value = query;
  remember(query);
  page.value?.querySelector('input')?.blur();
  resetScroll();
};

// 清空输入时重新展示最近搜索入口。
watch(keyword, (value) => {
  if (!value.trim()) {
    submitted.value = '';
  }
});

// 屏幕旋转改变宽度时同步内容高度。
useEventListener(window, 'resize', () => {
  if (window.innerWidth === viewport.value.width) {
    return;
  }

  viewport.value = {
    width: window.innerWidth,
    height: window.innerHeight,
  };
});

// 首次进入搜索时聚焦输入，返回结果列表时保留浏览状态。
onActivated(() => {
  if (!submitted.value) {
    page.value?.querySelector('input')?.focus({ preventScroll: true });
  }
});

// 从页面入口进入时开始新的搜索，播放返回时沿用当前结果。
onScopeDispose(
  router.afterEach((to, from) => {
    if (
      to.name === 'search' &&
      from.name !== 'search' &&
      from.name !== 'player'
    ) {
      keyword.value = '';
      submitted.value = '';
      resetScroll();
    }
  }),
);

// 关闭按钮与手机返回保持一致。
const handleClose = () => router.back();

// 清空记录前沿用全局确认框。
const handleClear = () => {
  eventBus.emit('confirm:show', {
    title: '清空搜索历史？',
    description: '将删除此设备中的全部搜索记录，此操作无法撤销。',
    confirmText: '清空',
    returnFocus: () => document.getElementById('search-keyword'),
    onConfirm: clear,
  });
};
</script>
