<template>
  <Dialog
    v-model:open="open"
    title="新增账号"
    description="选择账号权限，创建后使用邮箱登录。"
    :pending="pending"
    @close-auto-focus="handleCloseFocus"
  >
    <form novalidate @submit="handleCreate" @input="error = ''">
      <VeeField v-slot="{ componentField }" name="role">
        <Tabs v-bind="componentField" class="w-full gap-4">
          <TabsList class="w-full">
            <TabsTrigger value="user" :disabled="pending">用户</TabsTrigger>
            <TabsTrigger value="admin" :disabled="pending">管理员</TabsTrigger>
          </TabsList>
          <TabsContent :value="values.role" class="grid gap-4">
            <VeeField v-slot="{ componentField, errors }" name="username">
              <Field
                id="new-username"
                v-slot="{ control }"
                label="用户名"
                :error="errors[0]"
                :disabled="pending"
              >
                <Input
                  v-bind="{ ...componentField, ...control }"
                  required
                  maxlength="30"
                  autocomplete="off"
                  placeholder="3～30 位中英文、数字、下划线或句点"
                  :disabled="pending"
                />
              </Field>
            </VeeField>
            <VeeField v-slot="{ componentField, errors }" name="email">
              <Field
                id="new-email"
                v-slot="{ control }"
                label="邮箱"
                :error="errors[0]"
                :disabled="pending"
              >
                <Input
                  v-bind="{ ...componentField, ...control }"
                  type="email"
                  required
                  maxlength="254"
                  autocomplete="off"
                  placeholder="请输入邮箱"
                  :disabled="pending"
                />
              </Field>
            </VeeField>
            <VeeField v-slot="{ componentField, errors }" name="password">
              <Field
                id="new-password"
                v-slot="{ control }"
                label="密码"
                :error="errors[0]"
                :disabled="pending"
              >
                <Input
                  v-bind="{ ...componentField, ...control }"
                  type="password"
                  required
                  maxlength="128"
                  autocomplete="new-password"
                  placeholder="至少 6 位"
                  :disabled="pending"
                />
              </Field>
            </VeeField>
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
      </VeeField>
    </form>
  </Dialog>
</template>

<script setup lang="ts">
import { onScopeDispose, ref, watch } from 'vue';
import { Field as VeeField, useForm } from 'vee-validate';
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
import { createAccountSchema } from '@/schemas/account';
import { accountRequest } from '@/services/admin';
import { successToast } from '@ym-video/ui/lib/toast';
import { eventBus } from '@/utils/event-bus';

// 根组件只保留一个新增账号弹窗，列表通过事件刷新。
const open = ref(false);

// 角色与账号字段由表单统一管理，打开时默认创建普通用户。
const {
  values,
  handleSubmit,
  resetForm,
  isSubmitting: pending,
} = useForm({
  validationSchema: createAccountSchema,
  initialValues: { username: '', email: '', password: '', role: 'user' },
});

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
    }

    resetForm();
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

// 工具栏和空状态共用一个新增入口标识。
const handleCloseFocus = (event: Event) => {
  event.preventDefault();
  document.getElementById('users-create')?.focus();
};

// 管理员可创建两类账号，邀请注册仍固定为普通用户。
const handleCreate = handleSubmit(async (input) => {
  error.value = '';

  // 本次创建请求独立持有信号，关闭后不再处理返回值。
  const requestController = new AbortController();

  controller = requestController;
  try {
    await accountRequest('/admin/users', {
      method: 'POST',
      body: JSON.stringify(input),
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
      controller = undefined;
    }
  }
});
</script>
