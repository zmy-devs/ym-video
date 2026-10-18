<template>
  <Sheet v-model:open="open">
    <SheetContent
      id="player-episodes-sheet"
      :portal-container="container"
      class="w-80 gap-0"
      @open-auto-focus="handleOpenAutoFocus"
      @close-auto-focus="handleCloseAutoFocus"
    >
      <SheetHeader class="shrink-0 gap-4">
        <SheetTitle>选集</SheetTitle>
        <SheetDescription class="sr-only">
          共 {{ episodes.length }} 集，每页显示 50 集，选择后开始播放。
        </SheetDescription>
        <Select v-model="page">
          <SelectTrigger class="w-full" aria-label="集数分页">
            <SelectValue />
          </SelectTrigger>
          <SelectContent :portal-container="container">
            <SelectItem
              v-for="item in pages"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </SheetHeader>
      <ScrollArea :key="page" class="min-h-0 flex-1">
        <ol ref="list" class="grid grid-cols-2 gap-2 px-4 pb-4">
          <li v-for="item in visibleEpisodes" :key="item.index" class="min-w-0">
            <Button
              type="button"
              class="w-full h-10"
              :variant="selected === item.index ? 'default' : 'outline'"
              :title="item.episode.label"
              :aria-current="selected === item.index ? 'true' : undefined"
              @click="handleSelect(item.index)"
            >
              <span class="min-w-0 truncate">
                {{ formatRemarks(item.episode.label) }}
              </span>
            </Button>
          </li>
        </ol>
      </ScrollArea>
    </SheetContent>
  </Sheet>
</template>

<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatRemarks } from '@/lib/movie';
import { eventBus } from '@/utils/event-bus';
import type { Episode } from '@/types';

// 选集数据与当前播放集数来自页面，弹层挂在播放器内以兼容全屏。
const props = defineProps<{
  episodes: Episode[];
  selected: number;
  container: HTMLElement | null;
}>();

// 传递原始集数索引，避免分页后切错集。
const emit = defineEmits<{ select: [index: number] }>();

// 选集面板按需打开，不占用视频区域。
const open = defineModel<boolean>('open', { required: true });

// 保存打开面板前的焦点，关闭时返回原控制按钮。
const returnFocus = ref<HTMLElement | null>(null);

// 当前页的列表用于打开时聚焦正在播放的集数。
const list = ref<HTMLOListElement | null>(null);

// 每页最多展示五十集。
const pageSize = 50;

// 页码使用选择器所需的字符串值。
const page = ref('0');

// 尾页按真实集数截断。
const pages = computed(() =>
  Array.from(
    { length: Math.ceil(props.episodes.length / pageSize) },
    (_, index) => ({
      value: String(index),
      label: `第 ${index * pageSize + 1}–${Math.min((index + 1) * pageSize, props.episodes.length)} 集`,
    }),
  ),
);

// 仅处理当前页，并保留每集在完整列表中的真实索引。
const visibleEpisodes = computed(() =>
  props.episodes
    .slice(Number(page.value) * pageSize, (Number(page.value) + 1) * pageSize)
    .map((episode, index) => ({
      episode,
      index: Number(page.value) * pageSize + index,
    })),
);

// 监听打开事件，沿用当前播放集所在的分页。
const handleShow = () => {
  if (!props.episodes.length) {
    return;
  }

  returnFocus.value =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  open.value = true;
};

// 选集后收起面板，继续观看视频。
const handleSelect = (index: number) => {
  emit('select', index);
  open.value = false;
};

// 打开面板后聚焦当前集，并滚动到可见位置。
const handleOpenAutoFocus = (event: Event) => {
  // 当前页内正在播放的按钮。
  const selectedButton = list.value?.querySelector<HTMLButtonElement>(
    '[aria-current="true"]',
  );

  if (selectedButton) {
    event.preventDefault();
    selectedButton.focus();
    selectedButton.scrollIntoView({ block: 'nearest' });
  }
};

// 事件总线触发的面板没有 SheetTrigger，手动恢复关闭后的焦点。
const handleCloseAutoFocus = (event: Event) => {
  if (returnFocus.value?.isConnected) {
    event.preventDefault();
    returnFocus.value.focus();
  }
};

watch(
  [() => props.selected, () => props.episodes, open],
  () => {
    page.value = String(Math.floor(props.selected / pageSize));
  },
  { immediate: true },
);

// 离开播放页时注销监听，避免重复打开旧面板。
onScopeDispose(eventBus.on('player-episodes:show', handleShow));
</script>
