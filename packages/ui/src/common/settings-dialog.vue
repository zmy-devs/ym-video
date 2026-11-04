<template>
  <Dialog
    v-model:open="open"
    :pending="pending"
    :show-close-button="false"
    class="h-180 w-[calc(100vw-4rem)] max-h-[calc(100dvh-4rem)] flex flex-col gap-0 overflow-hidden bg-background p-0 sm:max-w-250"
    @close-auto-focus="emit('closeAutoFocus', $event)"
  >
    <template #header>
      <header
        class="h-10 flex shrink-0 items-center justify-between border-b bg-sidebar px-3"
      >
        <DialogTitle
          class="flex items-center gap-1.5 text-sm font-medium leading-none"
        >
          <Settings2 class="size-4" /><span>设置</span>
        </DialogTitle>
        <DialogClose v-if="!pending" as-child>
          <Button aria-label="关闭设置" variant="ghost" size="icon-xs">
            <X />
          </Button>
        </DialogClose>
      </header>
    </template>
    <Tabs
      v-if="open"
      v-model="selected"
      orientation="vertical"
      class="min-h-0 flex-1 flex-row gap-0"
    >
      <div class="w-65 flex shrink-0 flex-col border-r p-2">
        <TabsList
          class="h-auto w-full flex-col justify-start gap-1 rounded-none bg-transparent p-0"
        >
          <TabsTrigger
            v-for="item in items"
            :key="item.value"
            :value="item.value"
            :disabled="pending"
            class="h-8 w-full flex-none justify-start gap-2 border-0 p-2 font-normal shadow-none transition-colors hover:bg-accent/60 data-[state=active]:bg-accent/80 data-[state=active]:shadow-none dark:data-[state=inactive]:text-foreground dark:data-[state=active]:bg-accent/80 [&_svg]:size-4.5"
          >
            <component :is="item.icon" />
            <span>{{ item.label }}</span>
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent
        v-for="item in items"
        :key="item.value"
        :value="item.value"
        class="min-h-0 min-w-0"
      >
        <ScrollArea class="h-full">
          <div class="mx-auto w-[85%] py-8">
            <slot :name="item.value" />
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  </Dialog>
</template>

<script setup lang="ts">
import type { Component } from 'vue';
import { Settings2, X } from 'lucide-vue-next';
import { Button } from '@ym-video/ui/components/button';
import { DialogClose, DialogTitle } from '@ym-video/ui/components/dialog';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@ym-video/ui/components/tabs';
import { ScrollArea } from '@ym-video/ui/components/scroll-area';
import Dialog from './dialog.vue';

// 分类与内容插槽由应用提供，窗口结构统一维护。
defineProps<{
  items: { value: string; label: string; icon: Component }[];
  pending?: boolean;
}>();

// 当前分类和打开状态由应用管理。
const open = defineModel<boolean>('open', { required: true });
const selected = defineModel<string>('selected', { required: true });

// 应用负责恢复自己的设置入口焦点。
const emit = defineEmits<{ closeAutoFocus: [event: Event] }>();
</script>
