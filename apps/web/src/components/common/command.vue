<template>
  <Dialog v-model:open="open">
    <slot name="trigger" />
    <DialogContent
      class="overflow-hidden p-0"
      overlay-class="bg-black/50 backdrop-blur-sm"
    >
      <DialogHeader class="sr-only">
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>{{ description }}</DialogDescription>
      </DialogHeader>
      <Command>
        <slot />
      </Command>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Command } from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// 搜索等命令弹窗共用模糊背景与无障碍说明。
defineProps<{ title: string; description: string }>();

// 调用方统一控制按钮与快捷键打开弹窗。
const open = defineModel<boolean>('open', { required: true });
</script>
