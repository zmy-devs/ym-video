<template>
  <Command v-model:open="open" @close-auto-focus="handleCloseFocus">
    <CommandInput
      id="search-keyword"
      placeholder="输入片名，按回车搜索"
      class="pr-8"
      @input="handleInput"
    />
    <CommandList>
      <CommandItem
        v-if="keyword.trim()"
        :key="keyword"
        :value="`search:${keyword}`"
        class="m-1"
        @select="handleSearch(keyword)"
      >
        <Search />
        <span>搜索“{{ keyword.trim() }}”</span>
      </CommandItem>
      <CommandGroup v-if="recent.length" heading="最近搜索">
        <div
          v-for="item in recent"
          :key="item"
          class="group relative [&:not(:has([data-slot=command-item]))]:hidden"
        >
          <CommandItem
            :value="`recent:${item}`"
            class="pr-10"
            @select="handleSearch(item)"
          >
            <History class="text-current" />
            <span class="truncate">{{ item }}</span>
          </CommandItem>
          <Button
            variant="ghost"
            size="icon-xs"
            class="absolute top-1/2 right-1 -translate-y-1/2 opacity-0 transition-none group-hover:opacity-100 group-focus-within:opacity-100"
            @pointerdown.prevent
            @click.stop="remove(item)"
            @keydown.enter.stop
            @keydown.space.stop
          >
            <X class="size-4" />
          </Button>
        </div>
      </CommandGroup>
      <template v-if="recent.length && !keyword.trim()">
        <CommandSeparator />
        <CommandGroup>
          <CommandItem value="clear-history" @select="handleClear">
            <Trash2 class="text-current" />
            <span>清空搜索历史</span>
          </CommandItem>
        </CommandGroup>
      </template>
      <p
        v-if="!recent.length && !keyword.trim()"
        class="py-6 text-center text-sm text-muted-foreground"
      >
        输入片名开始搜索
      </p>
    </CommandList>
  </Command>
</template>

<script setup lang="ts">
import { onScopeDispose, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Search, History, Trash2, X } from 'lucide-vue-next';
import Command from './search-command.vue';
import { Button } from '@ym-video/ui/components/button';
import {
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@ym-video/ui/components/command';
import { eventBus } from '@/utils/event-bus';
import { useSearchHistory } from '@/composables/use-search-history';

// 桌面搜索弹窗提交后进入结果页。
const router = useRouter();

// 搜索弹窗打开状态。
const open = ref(false);

// 清空所有记录前单独确认，取消后保留搜索弹窗。
const clearOpen = ref(false);

// 当前输入的搜索关键词。
const keyword = ref('');

// 桌面和移动端使用相同的本地搜索历史。
const { recent, remember, remove, clear } = useSearchHistory();

watch(open, (value) => {
  if (value) {
    keyword.value = '';
  }
});

// CommandInput 内部管理过滤值，业务层通过原生输入事件同步搜索词。
const handleInput = (event: Event) => {
  if (event.target instanceof HTMLInputElement) {
    keyword.value = event.target.value;
  }
};

// 提交关键词并保持最近二十条唯一记录。
const handleSearch = async (value: string) => {
  // 本次请求使用的查询条件。
  const query = value.trim();
  if (!query) {
    return;
  }
  remember(query);

  await router.push({ path: '/search', query: { q: query } });
  open.value = false;
};

// 全局确认框叠加在搜索上，取消后仍保留搜索内容。
const handleClear = () => {
  clearOpen.value = true;
  eventBus.emit('confirm:show', {
    title: '清空搜索历史？',
    description: '将删除此设备中的全部搜索记录，此操作无法撤销。',
    confirmText: '清空',
    returnFocus: () => document.getElementById('search-keyword'),
    onConfirm: clear,
    onClose: () => {
      clearOpen.value = false;
    },
  });
};

// 关闭搜索弹窗后恢复当前页面入口焦点。
const handleCloseFocus = (event: Event) => {
  event.preventDefault();
  document.getElementById('search-trigger')?.focus();
};

onScopeDispose(
  eventBus.on('search:show', () => {
    open.value = true;
  }),
);
onScopeDispose(
  eventBus.on('search:toggle', () => {
    if (!clearOpen.value) {
      open.value = !open.value;
    }
  }),
);
onScopeDispose(
  eventBus.on('dialogs:close', () => {
    open.value = false;
  }),
);
</script>
