<template>
  <DialogRoot v-model:open="open">
    <DialogContent
      v-bind="$attrs"
      :show-close-button="showCloseButton && !pending"
      @interact-outside="handleBlockClose"
      @escape-key-down="handleBlockClose"
    >
      <slot name="header">
        <DialogHeader>
          <DialogTitle>{{ title }}</DialogTitle>
          <DialogDescription v-if="description" class="break-words">
            {{ description }}
          </DialogDescription>
        </DialogHeader>
      </slot>
      <slot />
    </DialogContent>
  </DialogRoot>
</template>

<script setup lang="ts">
import {
  Dialog as DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@ym-video/ui/components/dialog';

// 内容属性及关闭事件直接交给弹窗内容层。
defineOptions({ inheritAttrs: false });

// 业务弹窗共用标题、说明和提交期间的关闭约束。
const props = withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    pending?: boolean;
    showCloseButton?: boolean;
  }>(),
  { showCloseButton: true },
);

// 打开状态由业务组件控制。
const open = defineModel<boolean>('open', { required: true });

// 提交期间保留当前操作目标。
const handleBlockClose = (event: Event) => {
  if (props.pending) {
    event.preventDefault();
  }
};
</script>
