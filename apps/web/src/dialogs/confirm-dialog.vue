<template>
  <AlertDialog :open="open" @update:open="handleOpen">
    <AlertDialogContent
      @close-auto-focus="handleCloseFocus"
      @escape-key-down="handleBlockClose"
    >
      <AlertDialogHeader>
        <AlertDialogTitle>{{ options?.title }}</AlertDialogTitle>
        <AlertDialogDescription>{{
          options?.description
        }}</AlertDialogDescription>
      </AlertDialogHeader>
      <p v-if="error" role="alert" class="text-sm text-destructive">
        {{ error }}
      </p>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="pending">取消</AlertDialogCancel>
        <Button
          type="button"
          variant="destructive"
          :disabled="pending"
          @click="handleConfirm"
        >
          <LoaderCircle v-if="pending" class="animate-spin" />
          {{
            pending
              ? (options?.pendingText ?? '正在处理…')
              : (options?.confirmText ?? '确认删除')
          }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>

<script setup lang="ts">
import { onScopeDispose, ref, shallowRef } from 'vue';
import { LoaderCircle } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { eventBus } from '@/utils/event-bus';
import type { ConfirmDialogOptions } from './types';

// 全站确认操作共用一个实例，操作期间不允许覆盖目标。
const open = ref(false);

// 保存本次展示信息、操作和焦点恢复方式。
const options = shallowRef<ConfirmDialogOptions | null>(null);

// 请求失败保留确认框和原目标，允许重试。
const error = ref('');

// 提交期间阻止重复操作及手动关闭。
const pending = ref(false);

// 未提供恢复入口时回到打开前的元素。
let returnFocus: Element | null = null;

// 页面离开后取消请求并忽略迟到的结果。
let controller: AbortController | undefined;

// 关闭后先交还焦点，再清理业务回调。
const handleCloseFocus = (event: Event) => {
  event.preventDefault();
  const target = options.value?.returnFocus?.() ?? returnFocus;

  if (
    target instanceof HTMLElement &&
    target.isConnected &&
    !target.matches(':disabled')
  ) {
    target.focus();
  }

  options.value?.onClose?.();
  options.value = null;
  returnFocus = null;
};

// 同一时刻只接收一次确认请求。
const handleShow = (value: ConfirmDialogOptions) => {
  if (open.value || options.value) {
    return;
  }

  returnFocus = document.activeElement;
  options.value = value;
  error.value = '';
  open.value = true;
};

// 取消和 Escape 只能在空闲时关闭。
const handleOpen = (value: boolean) => {
  if (!pending.value) {
    open.value = value;
  }
};

// 请求期间保留目标，避免取消后误以为操作尚未发生。
const handleBlockClose = (event: Event) => {
  if (pending.value) {
    event.preventDefault();
  }
};

// 只有确认后才执行业务操作，失败在弹窗中反馈。
const handleConfirm = async () => {
  if (!options.value || pending.value) {
    return;
  }

  const requestController = new AbortController();

  controller = requestController;
  pending.value = true;
  error.value = '';

  try {
    await options.value.onConfirm(requestController.signal);

    if (!requestController.signal.aborted) {
      open.value = false;
    }
  } catch (cause) {
    if (!requestController.signal.aborted) {
      error.value = cause instanceof Error ? cause.message : '操作失败，请重试';
    }
  } finally {
    if (controller === requestController) {
      pending.value = false;
      controller = undefined;
    }
  }
};

// 路由切换强制关闭，不把旧操作带到下一页。
const handleClose = () => {
  controller?.abort();
  controller = undefined;
  pending.value = false;
  open.value = false;
};

onScopeDispose(eventBus.on('confirm:show', handleShow));
onScopeDispose(eventBus.on('dialogs:close', handleClose));
onScopeDispose(() => controller?.abort());
</script>
