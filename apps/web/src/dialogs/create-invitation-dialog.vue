<template>
  <Dialog v-model:open="open">
    <DialogContent
      :show-close-button="!pending"
      @interact-outside="handleBlockClose"
      @escape-key-down="handleBlockClose"
      @close-auto-focus="handleCloseFocus"
    >
      <DialogHeader>
        <DialogTitle>{{
          createdUrl ? '邀请链接已生成' : '新增邀请'
        }}</DialogTitle>
        <DialogDescription class="break-words">{{
          createdUrl
            ? `${name} · 链接永久有效，仅可注册一次。`
            : '填写分享名称作为备注，方便识别邀请。'
        }}</DialogDescription>
      </DialogHeader>
      <form
        v-if="!createdUrl"
        class="grid gap-6"
        novalidate
        @submit.prevent="handleCreate"
      >
        <FormField
          id="invitation-name"
          v-slot="{ control }"
          label="分享名称"
          :error="error"
          :disabled="pending"
        >
          <Input
            v-bind="control"
            v-model="name"
            required
            maxlength="80"
            autocomplete="off"
            placeholder="例如：分享给小明"
            :disabled="pending"
            @update:model-value="error = ''"
          />
        </FormField>
        <DialogFooter>
          <Button type="submit" :disabled="pending">
            <LoaderCircle v-if="pending" class="animate-spin" />
            {{ pending ? '正在生成…' : '下一步' }}
          </Button>
        </DialogFooter>
      </form>
      <template v-else>
        <FormField
          id="created-invitation"
          v-slot="{ control }"
          label="邀请链接"
        >
          <Input
            v-bind="control"
            class="select-text"
            :model-value="createdUrl"
            readonly
            @focus="handleSelectLink"
          />
        </FormField>
        <DialogFooter>
          <Button @click="handleCopy"><Copy />复制</Button>
        </DialogFooter>
      </template>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { nextTick, onScopeDispose, ref, watch } from 'vue';
import { Copy, LoaderCircle } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import FormField from '@/components/common/form-field.vue';
import { createInvitation, invitationUrl } from '@/services/admin';
import { errorToast, successToast } from '@/utils/toast';
import { eventBus } from '@/utils/event-bus';

// 弹窗先填写备注，再生成并展示邀请链接。
const open = ref(false);

// 分享名称仅作为后台备注保存。
const name = ref('');

// 完整链接同时决定是否进入复制步骤。
const createdUrl = ref('');

// 提交期间阻止重复生成和中途关闭。
const pending = ref(false);

// 校验或请求失败时在字段标题处提示并保留备注。
const error = ref('');

// 离开页面后忽略未完成的创建结果。
let controller: AbortController | undefined;

watch(
  open,
  (isOpen) => {
    if (!isOpen) {
      controller?.abort();
      controller = undefined;
      pending.value = false;
      return;
    }
    name.value = '';
    createdUrl.value = '';
    error.value = '';
  },
  { flush: 'sync' },
);

onScopeDispose(
  eventBus.on('invitation:show', () => {
    open.value = true;
  }),
);
onScopeDispose(
  eventBus.on('dialogs:close', () => {
    open.value = false;
  }),
);
onScopeDispose(() => controller?.abort());

// 提交时等待保存结果，避免重复创建或丢失生成链接。
const handleBlockClose = (event: Event) => {
  if (pending.value) {
    event.preventDefault();
  }
};

// 空状态与工具栏切换后，仍回到当前新增按钮。
const handleCloseFocus = (event: Event) => {
  event.preventDefault();
  document.getElementById('invitations-create')?.focus();
};

// 只有名称有效且点击下一步后，才请求生成链接。
const handleCreate = async () => {
  if (pending.value || createdUrl.value) {
    return;
  }
  name.value = name.value.trim();
  if (!name.value || name.value.length > 80) {
    error.value = '分享名称需为 1～80 个字符';
    document.getElementById('invitation-name')?.focus();
    return;
  }
  pending.value = true;
  error.value = '';

  // 切页或卸载后不能把旧链接展示到新草稿。
  const requestController = new AbortController();

  controller = requestController;
  try {
    // 服务端保存名称后返回可复制的单次邀请。
    const invitation = await createInvitation(
      name.value,
      requestController.signal,
    );

    requestController.signal.throwIfAborted();
    createdUrl.value = invitationUrl(invitation.token);
    eventBus.emit('invitations:changed');
    await nextTick();
    if (!requestController.signal.aborted) {
      document.getElementById('created-invitation')?.focus();
    }
  } catch (cause) {
    if (!requestController.signal.aborted) {
      error.value = cause instanceof Error ? cause.message : '生成失败，请重试';
    }
  } finally {
    if (controller === requestController) {
      pending.value = false;
      controller = undefined;
    }
  }
};

// 剪贴板不可用时保留只读输入框供手动复制。
const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(createdUrl.value);
    successToast('邀请链接已复制');
  } catch {
    errorToast('复制失败，请选中链接手动复制');
  }
};

// 生成成功后聚焦并选中完整链接。
const handleSelectLink = (event: FocusEvent) => {
  if (event.target instanceof HTMLInputElement) {
    event.target.select();
  }
};
</script>
