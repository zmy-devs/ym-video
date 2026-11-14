<template>
  <Drawer
    v-if="props.mobile"
    v-model:open="open"
    full-height
    @close-auto-focus="handleMenuCloseFocus"
  >
    <template #header>
      <Button
        v-if="library.customSources.length"
        variant="outline"
        size="icon"
        class="absolute top-4 left-4 size-11 rounded-full !bg-white text-black backdrop-blur-xl hover:text-black dark:!bg-card/60 dark:text-foreground dark:hover:text-foreground"
        @click="handleToggleEdit"
      >
        <X v-if="editing" class="size-5" />
        <SquarePen v-else class="size-5" />
      </Button>
      <DrawerClose v-else as-child>
        <Button
          variant="outline"
          size="icon"
          class="absolute top-4 left-4 size-11 rounded-full !bg-white text-black backdrop-blur-xl hover:text-black dark:!bg-card/60 dark:text-foreground dark:hover:text-foreground"
        >
          <X class="size-5" />
        </Button>
      </DrawerClose>
      <DrawerTitle class="sr-only">播放源</DrawerTitle>
      <DrawerDescription class="sr-only">
        选择播放源，或添加、编辑和删除本机自定义源
      </DrawerDescription>
    </template>
    <template #trigger>
      <DrawerTrigger as-child>
        <Button
          ref="trigger"
          variant="outline"
          size="icon"
          class="size-[58px] rounded-full !bg-white/60 backdrop-blur-xl dark:!bg-card/60"
        >
          <Server class="size-[22px]" />
        </Button>
      </DrawerTrigger>
    </template>
    <template #actions>
      <Button
        v-if="editing"
        variant="destructive"
        size="icon"
        :disabled="!selectedIds.length"
        class="size-11 rounded-full"
        @click="handleDeleteSelected"
      >
        <Trash2 class="size-[22px]" />
      </Button>
      <Button
        v-else
        size="icon"
        class="size-11 rounded-full"
        @click="handleEdit()"
      >
        <Plus class="size-[22px]" />
      </Button>
    </template>
    <MobileSourceDrawer
      v-model:selected="selectedIds"
      :editing="editing"
      @select="handleSource"
      @edit="handleEdit"
    />
  </Drawer>
  <DropdownMenu v-else v-model:open="open">
    <DropdownMenuTrigger as-child>
      <Button
        ref="trigger"
        type="button"
        variant="ghost"
        size="icon-sm"
        class="data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
      >
        <Server class="size-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      side="right"
      align="end"
      class="w-56"
      @close-auto-focus="handleMenuCloseFocus"
    >
      <DropdownMenuGroup v-if="library.platformSources.length">
        <DropdownMenuLabel class="text-xs text-muted-foreground"
          >播放源</DropdownMenuLabel
        >
        <DropdownMenuItem
          v-for="source in library.platformSources"
          :key="source.id"
          @select="handleSource(source.id)"
        >
          <Server />
          <span class="truncate">{{ source.name }}</span>
          <Check
            v-if="source.id === library.selected"
            class="ml-auto shrink-0 text-primary"
          />
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator
        v-if="library.platformSources.length && library.customSources.length"
      />
      <DropdownMenuGroup v-if="library.customSources.length">
        <DropdownMenuLabel class="text-xs text-muted-foreground"
          >我的播放源</DropdownMenuLabel
        >
        <div
          v-for="source in library.customSources"
          :key="source.id"
          data-source-row
          class="group relative"
        >
          <DropdownMenuItem
            class="pr-16"
            @select="handleSource(source.id)"
            @keydown.right.prevent.stop="handleActionFocus"
          >
            <Server />
            <span class="truncate">{{ source.name }}</span>
            <Check
              v-if="source.id === library.selected"
              class="absolute top-1/2 right-2 -translate-y-1/2 text-primary group-hover:opacity-0 group-focus-within:opacity-0"
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
              variant="ghost"
              size="icon-xs"
              @click.stop="handleEdit(source.id)"
            >
              <Pencil class="size-[15px]" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              class="text-destructive hover:text-destructive"
              @click.stop="handleDelete(source)"
            >
              <Trash2 class="size-[15px]" />
            </Button>
          </div>
        </div>
      </DropdownMenuGroup>
      <DropdownMenuSeparator v-if="library.sources.length" />
      <DropdownMenuItem @select="handleEdit()">
        <Plus class="text-current" />
        <span>添加播放源</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script setup lang="ts">
import { onScopeDispose, ref, useTemplateRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  Check,
  Pencil,
  Plus,
  Server,
  SquarePen,
  Trash2,
  X,
} from 'lucide-vue-next';
import { DrawerTrigger } from 'reka-ui';
import { Button } from '@ym-video/ui/components/button';
import {
  DrawerClose,
  DrawerDescription,
  DrawerTitle,
} from '@ym-video/ui/components/drawer';
import Drawer from '@ym-video/ui/common/drawer.vue';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ym-video/ui/components/dropdown-menu';
import { useLibraryStore } from '@/stores/library-store';
import { eventBus } from '@/utils/event-bus';
import { successToast } from '@ym-video/ui/lib/toast';
import type { CustomSource } from '@/types';
import MobileSourceDrawer from './mobile-source-drawer.vue';
import { useMobileDrawer } from '@/composables/use-mobile-drawer';

// 移动端调用方显式启用圆形 outline 触发按钮。
const props = withDefaults(defineProps<{ mobile?: boolean }>(), {
  mobile: false,
});

const route = useRoute();

// 切换播放源时清除旧源的分类路由。
const router = useRouter();

// 平台播放源、自定义源及当前选择。
const library = useLibraryStore();

// 弹层关闭时将焦点恢复到播放源入口。
const trigger = useTemplateRef<{ $el: HTMLElement; focus: () => void }>(
  'trigger',
);

// 播放源选择面板的显示状态。
const open = ref(false);

// 移动端编辑模式独立于当前使用的播放源。
const editing = ref(false);

// 多选列表只保存本次准备删除的自定义源 ID。
const selectedIds = ref<string[]>([]);

useMobileDrawer(open);

// 抽屉每次重新打开时从播放源选择模式开始。
watch(open, (value) => {
  if (!value) {
    editing.value = false;
    selectedIds.value = [];
  }
});

// 全局弹窗和确认框关闭后恢复到触发入口。
onScopeDispose(
  eventBus.on('source-switcher:focus', () => trigger.value?.focus()),
);

// 菜单关闭阶段允许弹窗接管焦点。
let openingDialog = false;

// 新增时由弹窗接管焦点，避免菜单关闭时抢回焦点。
const handleMenuCloseFocus = (event: Event) => {
  if (openingDialog) {
    event.preventDefault();
    openingDialog = false;
  }
};

// 移动端表单叠加在抽屉上，桌面端先收起菜单。
const handleEdit = (id?: string) => {
  if (!props.mobile) {
    openingDialog = true;
    open.value = false;
  }

  eventBus.emit('source:show', id);
};

// 进入和退出编辑时清空待删除项，保留当前播放源。
const handleToggleEdit = () => {
  editing.value = !editing.value;
  selectedIds.value = [];
};

// 批量删除勾选的本机源，当前源被删除时清理旧分类路由。
const handleDeleteSelected = async () => {
  // 固定本次删除目标并立即清空勾选，避免重复提交。
  const ids = selectedIds.value;

  // 删除前记录当前源是否在本次勾选范围内。
  const wasSelected = ids.includes(library.selected);

  selectedIds.value = [];
  await library.removeSources(ids);

  if (!library.customSources.length) {
    editing.value = false;
  }

  successToast('播放源已删除');

  if (wasSelected && route.path.startsWith('/category')) {
    await router.push('/category');
  }
};

// 先确认再删除，当前源删除后同步清理旧分类路由。
const handleDelete = (source: CustomSource) => {
  openingDialog = true;
  open.value = false;
  eventBus.emit('confirm:show', {
    title: '删除播放源？',
    description: `确定删除“${source.name}”吗？删除后可重新添加，观看历史会保留。`,
    pendingText: '正在删除…',
    returnFocus: () => trigger.value?.$el ?? null,
    onConfirm: async (signal) => {
      const wasSelected = library.selected === source.id;

      await library.removeSources([source.id]);
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
      ?.querySelector<HTMLElement>('[data-slot="dropdown-menu-item"]')
      ?.focus();
  }
};

// 选源后分类返回全部，避免沿用其他源的分类 ID。
const handleSource = async (id: unknown) => {
  if (typeof id !== 'string' || id === library.selected) {
    return;
  }
  if (!props.mobile) {
    open.value = false;
  }
  if (route.path.startsWith('/category')) {
    await router.push('/category');
  }
  await library.select(id);
};
</script>
