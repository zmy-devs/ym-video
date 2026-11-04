<template>
  <Dialog
    v-model:open="open"
    title="新增账号"
    description="选择账号权限，创建后使用邮箱登录。"
    :pending="pending"
    @close-auto-focus="handleCloseFocus"
  >
    <form novalidate @submit.prevent="handleCreate">
      <Tabs
        :model-value="draft.role"
        class="w-full gap-4"
        @update:model-value="handleRoleChange"
      >
        <TabsList class="w-full">
          <TabsTrigger value="user" :disabled="pending">用户</TabsTrigger>
          <TabsTrigger value="admin" :disabled="pending">管理员</TabsTrigger>
        </TabsList>
        <TabsContent :value="draft.role" class="grid gap-4">
          <Field
            id="new-username"
            v-slot="{ control }"
            label="用户名"
            :error="fieldErrors.username?.[0]"
            :disabled="pending"
          >
            <Input
              v-bind="control"
              v-model="draft.username"
              required
              maxlength="30"
              autocomplete="off"
              placeholder="3～30 位中英文、数字、下划线或句点"
              :disabled="pending"
              @update:model-value="handleFieldChange('username')"
            />
          </Field>
          <Field
            id="new-email"
            v-slot="{ control }"
            label="邮箱"
            :error="fieldErrors.email?.[0]"
            :disabled="pending"
          >
            <Input
              v-bind="control"
              v-model="draft.email"
              type="email"
              required
              maxlength="254"
              autocomplete="off"
              placeholder="请输入邮箱"
              :disabled="pending"
              @update:model-value="handleFieldChange('email')"
            />
          </Field>
          <Field
            id="new-password"
            v-slot="{ control }"
            label="密码"
            :error="fieldErrors.password?.[0]"
            :disabled="pending"
          >
            <Input
              v-bind="control"
              v-model="draft.password"
              type="password"
              required
              maxlength="128"
              autocomplete="new-password"
              placeholder="至少 6 位"
              :disabled="pending"
              @update:model-value="handleFieldChange('password')"
            />
          </Field>
          <p class="min-h-5 text-sm text-destructive">
            {{ error }}
          </p>
          <DialogFooter>
            <Button type="submit" :disabled="pending"
              ><LoaderCircle v-if="pending" class="animate-spin" />{{
                pending ? '正在创建…' : '创建账号'
              }}</Button
            >
          </DialogFooter>
        </TabsContent>
      </Tabs>
    </form>
  </Dialog>
</template>

<script setup lang="ts">
import { onScopeDispose, ref, watch } from 'vue';
import { LoaderCircle } from 'lucide-vue-next';
import { Button } from '@ym-video/ui/components/button';
import { Input } from '@ym-video/ui/components/input';
import Dialog from '@ym-video/ui/common/dialog.vue';
import { DialogFooter } from '@ym-video/ui/components/dialog';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@ym-video/ui/components/tabs';
import Field from '@ym-video/ui/common/field.vue';
import { accountSchema } from '@ym-video/account/schema';
import { accountRequest } from '@/services/admin';
import { successToast } from '@ym-video/ui/lib/toast';
import { eventBus } from '@/utils/event-bus';

// 根组件只保留一个新增账号弹窗，列表通过事件刷新。
const open = ref(false);

// 每次打开都默认创建普通用户，关闭即清除密码。
const draft = ref({
  username: '',
  email: '',
  password: '',
  role: 'user' as 'user' | 'admin',
});

// 提交状态同时控制关闭、切换角色和重复请求。
const pending = ref(false);

// 字段校验与整体服务异常分开呈现。
const fieldErrors = ref<Partial<Record<keyof typeof draft.value, string[]>>>(
  {},
);

// 预留固定高度的整体请求错误，不挤动输入框。
const error = ref('');

// 切页关闭弹窗时取消请求，避免旧结果污染下一份草稿。
let controller: AbortController | undefined;

watch(
  open,
  (isOpen) => {
    if (!isOpen) {
      controller?.abort();
      controller = undefined;
      pending.value = false;
    }

    draft.value = { username: '', email: '', password: '', role: 'user' };
    fieldErrors.value = {};
    error.value = '';
  },
  { flush: 'sync' },
);

onScopeDispose(
  eventBus.on('account:show', () => {
    open.value = true;
  }),
);
onScopeDispose(
  eventBus.on('dialogs:close', () => {
    open.value = false;
  }),
);
onScopeDispose(() => controller?.abort());

// 只接受两个明确的后台账号角色。
const handleRoleChange = (value: unknown) => {
  if (!pending.value && (value === 'user' || value === 'admin')) {
    draft.value.role = value;
  }
};

// 修改字段时清除该字段上一次的反馈。
const handleFieldChange = (field: keyof typeof draft.value) => {
  delete fieldErrors.value[field];
  error.value = '';
};

// 工具栏和空状态共用一个新增入口标识。
const handleCloseFocus = (event: Event) => {
  event.preventDefault();
  document.getElementById('users-create')?.focus();
};

// 管理员可创建两类账号，邀请注册仍固定为普通用户。
const handleCreate = async () => {
  if (pending.value) {
    return;
  }
  const result = accountSchema.safeParse(draft.value);
  fieldErrors.value = result.success ? {} : result.error.flatten().fieldErrors;
  error.value = '';
  if (!result.success) {
    return;
  }
  pending.value = true;

  // 本次创建请求独立持有信号，关闭后不再处理返回值。
  const requestController = new AbortController();

  controller = requestController;
  try {
    await accountRequest('/admin/users', {
      method: 'POST',
      body: JSON.stringify({ ...result.data, role: draft.value.role }),
      signal: requestController.signal,
    });
    requestController.signal.throwIfAborted();
    open.value = false;
    successToast('账号已创建');
    eventBus.emit('accounts:changed');
  } catch (cause) {
    if (requestController.signal.aborted) {
      return;
    }
    error.value = cause instanceof Error ? cause.message : '创建失败，请重试';
  } finally {
    if (controller === requestController) {
      pending.value = false;
      controller = undefined;
    }
  }
};
</script>
