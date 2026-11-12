<template>
  <Sheet v-model:open="open">
    <SheetContent
      :portal-container="container"
      :show-close-button="!mobile"
      class="w-80 gap-0 data-[state=open]:duration-300"
      @open-auto-focus="handleOpenAutoFocus"
      @close-auto-focus="handleCloseAutoFocus"
    >
      <SheetHeader class="shrink-0 gap-4">
        <SheetTitle :class="{ 'sr-only': mobile }">选集</SheetTitle>
        <Select v-model="page">
          <SelectTrigger class="w-full">
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
              class="w-full h-10"
              :variant="selected === item.index ? 'default' : 'outline'"
              :data-selected="selected === item.index"
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
import { computed, ref, useTemplateRef, watch } from 'vue';
import { watchImmediate } from '@vueuse/core';
import { Button } from '@ym-video/ui/components/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@ym-video/ui/components/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ym-video/ui/components/select';
import { ScrollArea } from '@ym-video/ui/components/scroll-area';
import { formatRemarks, type Episode } from '../../../lib/movie.ts';

// 选集数据与当前播放集数来自页面，弹层挂在播放器内以兼容全屏。
const props = defineProps<{
  episodes: Episode[];
  selected: number;
  container: HTMLElement | null;
  mobile?: boolean;
}>();

// 传递原始集数索引，避免分页后切错集。
const emit = defineEmits<{ select: [index: number] }>();

// 选集面板按需打开，不占用视频区域。
const open = defineModel<boolean>('open', { required: true });

// 保存打开面板前的焦点，关闭时返回原控制按钮。
const returnFocus = ref<HTMLElement | null>(null);

// 当前页的列表用于打开时聚焦正在播放的集数。
const list = useTemplateRef<HTMLOListElement>('list');

// 每页最多展示五十集。
const pageSize = 50;

// 页码使用选择器所需的字符串值。
const page = ref('0');

// 当前分页在完整集数列表中的起始索引。
const pageStart = computed(() => Number(page.value) * pageSize);

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
    .slice(pageStart.value, pageStart.value + pageSize)
    .map((episode, index) => ({
      episode,
      index: pageStart.value + index,
    })),
);

// 面板打开时记录触发控件，关闭后恢复焦点。
watch(open, (value) => {
  if (value) {
    returnFocus.value =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  }
});

// 选集后收起面板，继续观看视频。
const handleSelect = (index: number) => {
  emit('select', index);
  open.value = false;
};

// 打开面板后聚焦当前集，并滚动到可见位置。
const handleOpenAutoFocus = (event: Event) => {
  // 当前页内正在播放的按钮。
  const selectedButton = list.value?.querySelector<HTMLButtonElement>(
    '[data-selected="true"]',
  );

  if (selectedButton) {
    event.preventDefault();
    selectedButton.focus();
    selectedButton.scrollIntoView({ block: 'nearest' });
  }
};

// 关闭面板后把焦点恢复到选集按钮。
const handleCloseAutoFocus = (event: Event) => {
  if (returnFocus.value?.isConnected) {
    event.preventDefault();
    returnFocus.value.focus();
  }
};

watchImmediate([() => props.selected, () => props.episodes, open], () => {
  page.value = String(Math.floor(props.selected / pageSize));
});
</script>
