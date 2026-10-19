<template>
  <DropdownMenu v-model:open="open">
    <DropdownMenuTrigger as-child>
      <Button
        id="source-switcher"
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="切换播放源"
        title="切换播放源"
        class="data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
      >
        <Server class="size-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      side="right"
      align="end"
      :side-offset="8"
      class="w-60"
      @close-auto-focus="handleMenuCloseFocus"
    >
      <DropdownMenuLabel
        v-if="library.platformSources.length"
        class="text-xs text-muted-foreground"
      >
        播放源
      </DropdownMenuLabel>
      <DropdownMenuItem
        v-for="source in library.platformSources"
        :key="source.id"
        :aria-current="source.id === library.selected ? true : undefined"
        @select="handleSource(source.id)"
      >
        <Server class="text-current" />
        <span class="truncate">{{ source.name }}</span>
        <Check
          v-if="source.id === library.selected"
          class="ml-auto shrink-0 text-current"
        />
      </DropdownMenuItem>
      <DropdownMenuSeparator
        v-if="library.platformSources.length && library.customSources.length"
      />
      <DropdownMenuLabel
        v-if="library.customSources.length"
        class="text-xs text-muted-foreground"
      >
        我的播放源
      </DropdownMenuLabel>
      <p id="source-actions-hint" class="sr-only">
        按右方向键访问编辑和删除按钮。
      </p>
      <div
        v-for="source in library.customSources"
        :key="source.id"
        data-source-row
        class="group relative"
      >
        <DropdownMenuItem
          :aria-current="source.id === library.selected ? true : undefined"
          aria-describedby="source-actions-hint"
          class="pr-16"
          @select="handleSource(source.id)"
          @keydown.right.prevent.stop="handleActionFocus"
        >
          <Server class="text-current" />
          <span class="truncate">{{ source.name }}</span>
          <Check
            v-if="source.id === library.selected"
            class="absolute top-1/2 right-2 -translate-y-1/2 text-current group-hover:opacity-0 group-focus-within:opacity-0"
          />
        </DropdownMenuItem>
        <div
          class="absolute top-1/2 right-1 flex -translate-y-1/2 gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
          @keydown.enter.stop
          @keydown.space.stop
          @keydown.right.prevent.stop="handleNextAction"
          @keydown.left.prevent.stop="handleRowFocus"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            :aria-label="`编辑播放源：${source.name}`"
            title="编辑播放源"
            @click.stop="handleEdit(source.id)"
          >
            <Pencil class="size-[15px]" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            :aria-label="`删除播放源：${source.name}`"
            title="删除播放源"
            class="text-destructive hover:text-destructive"
            @click.stop="handleDelete(source)"
          >
            <Trash2 class="size-[15px]" />
          </Button>
        </div>
      </div>
      <DropdownMenuSeparator v-if="library.sources.length" />
      <DropdownMenuItem @select="handleEdit()">
        <Plus class="text-current" />
        <span>添加播放源</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Check, Pencil, Plus, Server, Trash2 } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLibraryStore } from '@/stores/library';
import { eventBus } from '@/utils/event-bus';
import { successToast } from '@/utils/toast';
import type { CustomSource } from '@/types';

// 当前页面用于判断是否需要重置分类。
const route = useRoute();

// 切换播放源时清除旧源的分类路由。
const router = useRouter();

// 平台播放源、自定义源及当前选择。
const library = useLibraryStore();

// 图标操作先关闭菜单，再交给根组件的弹窗。
const open = ref(false);

// 菜单关闭阶段允许弹窗接管焦点。
let openingDialog = false;

// 新增时由弹窗接管焦点，避免菜单关闭时抢回焦点。
const handleMenuCloseFocus = (event: Event) => {
  if (openingDialog) {
    event.preventDefault();
    openingDialog = false;
  }
};

// 添加与编辑只发送业务事件，不直接持有弹窗状态。
const handleEdit = (id?: string) => {
  openingDialog = true;
  open.value = false;
  eventBus.emit('source:show', id);
};

// 先确认再删除，当前源删除后同步清理旧分类路由。
const handleDelete = (source: CustomSource) => {
  openingDialog = true;
  open.value = false;
  eventBus.emit('confirm:show', {
    title: '删除播放源？',
    description: `确定删除“${source.name}”吗？删除后可重新添加，观看历史会保留。`,
    pendingText: '正在删除…',
    returnFocus: () => document.getElementById('source-switcher'),
    onConfirm: async (signal) => {
      const wasSelected = library.selected === source.id;

      await library.removeSource(source.id);
      signal.throwIfAborted();
      successToast('播放源已删除');

      if (wasSelected && route.path.startsWith('/category')) {
        await router.push('/category');
      }
    },
  });
};

// 菜单项使用右方向键进入同行操作，避免嵌套交互控件。
const handleActionFocus = (event: KeyboardEvent) => {
  if (event.currentTarget instanceof HTMLElement) {
    event.currentTarget
      .closest('[data-source-row]')
      ?.querySelector<HTMLButtonElement>('button')
      ?.focus();
  }
};

// 右方向键在编辑与删除按钮之间切换。
const handleNextAction = (event: KeyboardEvent) => {
  if (event.target instanceof HTMLButtonElement) {
    const next =
      event.target.nextElementSibling ??
      event.target.parentElement?.firstElementChild;

    if (next instanceof HTMLButtonElement) {
      next.focus();
    }
  }
};

// 左方向键返回同行播放源选择入口。
const handleRowFocus = (event: KeyboardEvent) => {
  if (event.currentTarget instanceof HTMLElement) {
    event.currentTarget
      .closest('[data-source-row]')
      ?.querySelector<HTMLElement>('[role="menuitem"]')
      ?.focus();
  }
};

// 选源后分类返回全部，避免沿用其他源的分类 ID。
const handleSource = async (id: unknown) => {
  if (typeof id !== 'string' || id === library.selected) {
    return;
  }
  if (route.path.startsWith('/category')) {
    await router.push('/category');
  }
  await library.select(id);
};
</script>
