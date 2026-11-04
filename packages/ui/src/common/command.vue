<template>
  <Dialog
    v-model:open="open"
    class="top-[20vh] w-[calc(100vw-2rem)] max-w-lg translate-y-0 gap-0 overflow-hidden p-0"
    overlay-class="bg-black/50 backdrop-blur-sm"
    @close-auto-focus="emit('closeAutoFocus', $event)"
  >
    <template #header />
    <CommandRoot><slot /></CommandRoot>
  </Dialog>
</template>

<script setup lang="ts">
import { Command as CommandRoot } from '@ym-video/ui/components/command';
import Dialog from './dialog.vue';

// 调用方统一控制按钮与快捷键打开弹窗。
const open = defineModel<boolean>('open', { required: true });

// 关闭后的焦点恢复交给业务入口。
const emit = defineEmits<{ closeAutoFocus: [event: Event] }>();
</script>
