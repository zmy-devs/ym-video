<template>
  <SidebarMenuItem>
    <CommonCommand
      v-model:open="open"
      title="搜索影视"
      description="输入片名搜索，或选择最近搜索记录。"
    >
      <template #trigger>
        <CommonTooltip label="搜索影视资源" :shortcut="shortcut">
          <DialogTrigger as-child>
            <SidebarMenuButton
              :is-active="route.path === '/search'"
              aria-label="搜索"
            >
              <Search />
              <span>搜索</span>
            </SidebarMenuButton>
          </DialogTrigger>
        </CommonTooltip>
      </template>
      <CommandInput
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
            <CommandItem value="clear-history" @select="clearOpen = true">
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
      <AlertDialog v-model:open="clearOpen">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>清空搜索历史？</AlertDialogTitle>
            <AlertDialogDescription>
              将删除此浏览器中的全部搜索记录，此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction @click="handleClear">清空</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CommonCommand>
  </SidebarMenuItem>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useEventListener } from '@vueuse/core';
import { Search, History, Trash2, X } from 'lucide-vue-next';
import CommonTooltip from '@/components/common/tooltip.vue';
import CommonCommand from '@/components/common/command.vue';
import { Button } from '@/components/ui/button';
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { readLocal, writeLocal } from '@/lib/storage';

// 搜索结果页对应的导航状态。
const route = useRoute();

// 搜索结果通过路由展示，弹窗保留最近搜索入口。
const router = useRouter();

// 搜索弹窗打开状态。
const open = ref(false);

// 提示使用当前平台对应的搜索快捷键。
const shortcut = navigator.userAgent.includes('Mac') ? '⌘ K' : 'Ctrl K';

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

// 用户确认后清空当前浏览器的搜索记录。
const handleClear = () => {
  recent.value = [];
  writeLocal('searches', []);
};

useEventListener(window, 'keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    if (!clearOpen.value) {
      open.value = !open.value;
    }
  }
});
</script>
