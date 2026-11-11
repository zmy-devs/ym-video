<template>
  <Dialog
    v-model:open="open"
    :title="createdCode ? '邀请码已生成' : '新增邀请码'"
    :description="description"
    :pending="pending"
    @close-auto-focus="handleCloseFocus"
  >
    <form
      v-if="!createdCode"
      class="grid gap-6"
      novalidate
      @submit.prevent="handleCreate"
    >
      <Field
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
      </Field>
      <DialogFooter>
        <Button type="submit" :disabled="pending">
          <LoaderCircle v-if="pending" class="animate-spin" />
          {{ pending ? '正在生成…' : '下一步' }}
        </Button>
      </DialogFooter>
    </form>
    <template v-else>
      <Field id="created-invitation" v-slot="{ control }" label="邀请码">
        <Input
          v-bind="control"
          class="select-text"
          :model-value="createdCode"
          readonly
          @focus="handleSelectCode"
        />
      </Field>
      <DialogFooter>
        <Button @click="handleCopy">
          <Check v-if="copied" />
          <Copy v-else />
          {{ copied ? '已复制' : '复制' }}
        </Button>
      </DialogFooter>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { nextTick, onScopeDispose, computed, ref, watch } from 'vue';
import { Check, Copy, LoaderCircle } from 'lucide-vue-next';
import { Button } from '@ym-video/ui/components/button';
import { Input } from '@ym-video/ui/components/input';
import Dialog from '@ym-video/ui/common/dialog.vue';
import { DialogFooter } from '@ym-video/ui/components/dialog';
import Field from '@ym-video/ui/common/field.vue';
import { createInvitation } from '@/services/admin';
import { errorToast } from '@ym-video/ui/lib/toast';
import { eventBus } from '@/utils/event-bus';

// 弹窗先填写备注，再生成并展示邀请码。
const open = ref(false);

// 分享名称仅作为后台备注保存。
const name = ref('');

// 邀请码决定是否进入复制步骤。
const createdCode = ref('');

// 创建成功后展示当前邀请的分享说明。
const description = computed(() =>
  createdCode.value
    ? `${name.value} · 邀请码仅可注册一次。`
    : '填写分享名称作为备注，方便识别邀请。',
);

// 复制成功后在按钮内反馈，重新打开弹窗时重置。
const copied = ref(false);

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
    createdCode.value = '';
    copied.value = false;
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

// 空状态与工具栏切换后，仍回到当前新增按钮。
const handleCloseFocus = (event: Event) => {
  event.preventDefault();
  document.getElementById('invitations-create')?.focus();
};

// 只有名称有效且点击下一步后，才请求生成邀请码。
const handleCreate = async () => {
  if (pending.value || createdCode.value) {
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

  // 切页或卸载后不能把旧邀请码展示到新草稿。
  const requestController = new AbortController();

  controller = requestController;
  try {
    // 服务端保存名称后返回可复制的单次邀请码。
    const invitation = await createInvitation(
      name.value,
      requestController.signal,
    );

    requestController.signal.throwIfAborted();
    createdCode.value = invitation.code;
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

// 复制结果仅更新当前邀请码，剪贴板不可用时仍可手动复制。
const handleCopy = async () => {
  // 关闭或重新生成邀请码后，忽略旧复制请求的结果。
  const code = createdCode.value;

  try {
    await navigator.clipboard.writeText(code);
    if (open.value && createdCode.value === code) {
      copied.value = true;
    }
  } catch {
    if (open.value && createdCode.value === code) {
      copied.value = false;
      errorToast('复制失败，请选中邀请码手动复制');
    }
  }
};

// 生成成功后聚焦并选中邀请码。
const handleSelectCode = (event: FocusEvent) => {
  if (event.target instanceof HTMLInputElement) {
    event.target.select();
  }
};
</script>
