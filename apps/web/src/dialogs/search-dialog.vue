<template>
  <CommonCommand
    v-model:open="open"
    title="搜索影视"
    description="输入片名搜索，或选择最近搜索记录。"
    @close-auto-focus="handleCloseFocus"
  >
    <CommandInput
      id="search-keyword"
      placeholder="输入片名，按回车搜索"
      aria-label="影视名称"
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
            type="button"
            variant="ghost"
            size="icon-xs"
            :aria-label="`删除搜索记录：${item}`"
            class="absolute top-1/2 right-1 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
            @pointerdown.prevent
            @click.stop="handleRemove(item)"
            @keydown.enter.stop
            @keydown.space.stop
          >
            <X />
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
  </CommonCommand>
</template>

<script setup lang="ts">
import { onScopeDispose, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Search, History, Trash2, X } from 'lucide-vue-next';
import CommonCommand from '@/components/common/command.vue';
import { Button } from '@/components/ui/button';
import {
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { readLocal, writeLocal } from '@/lib/storage';
import { eventBus } from '@/utils/event-bus';

// 搜索结果通过路由展示，弹窗保留最近搜索入口。
const router = useRouter();

// 搜索弹窗打开状态。
const open = ref(false);

// 清空所有记录前单独确认，取消后保留搜索弹窗。
const clearOpen = ref(false);

// 当前输入的搜索关键词。
const keyword = ref('');

// 当前浏览器的最近搜索记录。
const recent = ref<string[]>([]);

watch(open, (value) => {
  if (value) {
    keyword.value = '';
    recent.value = readLocal(
      'searches',
      [],
      (item): item is string[] =>
        Array.isArray(item) && item.every((entry) => typeof entry === 'string'),
    );
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
  recent.value = [
    query,
    ...recent.value.filter((item) => item !== query),
  ].slice(0, 20);
  writeLocal('searches', recent.value);
  await router.push({ path: '/search', query: { q: query } });
  open.value = false;
};

// 只删除指定搜索记录，保留弹窗和当前输入。
const handleRemove = (value: string) => {
  recent.value = recent.value.filter((item) => item !== value);
  writeLocal('searches', recent.value);
};

// 全局确认框叠加在搜索上，取消后仍保留搜索内容。
const handleClear = () => {
  clearOpen.value = true;
  eventBus.emit('confirm:show', {
    title: '清空搜索历史？',
    description: '将删除此浏览器中的全部搜索记录，此操作无法撤销。',
    confirmText: '清空',
    returnFocus: () => document.getElementById('search-keyword'),
    onConfirm: () => {
      recent.value = [];
      writeLocal('searches', []);
    },
    onClose: () => {
      clearOpen.value = false;
    },
  });
};

// 根弹窗没有 DialogTrigger，关闭后恢复侧栏入口焦点。
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
