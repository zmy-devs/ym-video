<template>
  <form class="grid gap-6" novalidate @submit.prevent="handlePassword">
    <FieldGroup>
      <Field
        v-for="field in passwordFields"
        :key="field.key"
        :id="`settings-${field.key}`"
        v-slot="{ control }"
        :label="field.label"
        :error="fieldErrors[field.key]"
        :disabled="!!pending"
      >
        <Input
          v-bind="control"
          v-model="passwords[field.key]"
          type="password"
          required
          maxlength="128"
          :autocomplete="field.autocomplete"
          :placeholder="field.placeholder"
          :disabled="!!pending"
          @update:model-value="handleFieldChange(field.key)"
        />
      </Field>
    </FieldGroup>
    <FieldError v-if="passwordError" role="alert">{{
      passwordError
    }}</FieldError>
    <DialogFooter>
      <Button type="submit" :disabled="!!pending">
        <LoaderCircle v-if="pending === 'password'" class="animate-spin" />
        {{ pending === 'password' ? '保存中…' : '保存' }}
      </Button>
    </DialogFooter>
  </form>
</template>

<script setup lang="ts">
import { onScopeDispose, ref } from 'vue';
import { LoaderCircle } from 'lucide-vue-next';
import { Button } from '@ym-video/ui/components/button';
import { Input } from '@ym-video/ui/components/input';
import { DialogFooter } from '@ym-video/ui/components/dialog';
import { FieldGroup, FieldError } from '@ym-video/ui/components/field';
import Field from '@ym-video/ui/common/field.vue';
import type { AccountClient } from '@ym-video/account/client';
import { z } from 'zod';
import { passwordSchema } from '@ym-video/account/schema';
import { successToast } from '@ym-video/ui/lib/toast';

// 两端的密码弹窗复用同一套表单、校验和提交。
const props = defineProps<{ client: AccountClient }>();

// 密码修改期间阻止重复操作。
const pending = defineModel<'username' | 'password' | null>('pending', {
  required: true,
});

// 修改成功后交给调用方关闭弹窗。
const emit = defineEmits<{ saved: [] }>();

// 密码保留原始输入，不做 trim 或大小写处理。
const passwords = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

// 表单字段元数据同时约束字段名与浏览器自动填充行为。
const passwordFields = [
  {
    key: 'currentPassword',
    label: '当前密码',
    autocomplete: 'current-password',
    placeholder: '请输入当前密码',
  },
  {
    key: 'newPassword',
    label: '新密码',
    autocomplete: 'new-password',
    placeholder: '请输入新密码',
  },
  {
    key: 'confirmPassword',
    label: '确认新密码',
    autocomplete: 'new-password',
    placeholder: '再次输入新密码',
  },
] as const;

// 校验错误按密码字段展示。
const fieldErrors = ref<Partial<Record<keyof typeof passwords.value, string>>>(
  {},
);

// 接口失败时保留当前输入供用户修正。
const passwordError = ref('');

// 关闭表单后取消尚未完成的请求。
let controller: AbortController | undefined;

onScopeDispose(() => {
  controller?.abort();
  controller = undefined;
  passwords.value = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };
  pending.value = null;
});

// 编辑字段时仅清除该字段和表单的旧反馈。
const handleFieldChange = (field: keyof typeof passwords.value) => {
  delete fieldErrors.value[field];
  passwordError.value = '';
};

// 校验当前密码后修改凭据，同时撤销其他登录会话。
const handlePassword = async () => {
  if (pending.value) {
    return;
  }

  fieldErrors.value = {};
  passwordError.value = '';
  const result = z
    .object({
      currentPassword: z.string().min(1, '请输入当前密码'),
      newPassword: passwordSchema,
      confirmPassword: z.string(),
    })
    .refine((value) => value.newPassword !== value.currentPassword, {
      path: ['newPassword'],
      message: '新密码不能与当前密码相同',
    })
    .refine((value) => value.newPassword === value.confirmPassword, {
      path: ['confirmPassword'],
      message: '两次输入的密码不一致',
    })
    .safeParse(passwords.value);

  if (!result.success) {
    fieldErrors.value = Object.fromEntries(
      result.error.issues.map((issue) => [issue.path[0], issue.message]),
    );
    return;
  }

  pending.value = 'password';

  // 密码只通过当前会话的原生接口提交，不保存到浏览器存储。
  const requestController = new AbortController();

  controller = requestController;
  try {
    // 成功响应会携带当前设备的新会话 Cookie。
    const result = await props.client.changePassword(
      {
        currentPassword: passwords.value.currentPassword,
        newPassword: passwords.value.newPassword,
        revokeOtherSessions: true,
      },
      { signal: requestController.signal, retry: 0 },
    );

    requestController.signal.throwIfAborted();
    if (result.error) {
      if (result.error.code === 'INVALID_PASSWORD') {
        fieldErrors.value.currentPassword = '当前密码不正确，请重新输入';
      } else if (
        ['PASSWORD_TOO_SHORT', 'PASSWORD_TOO_LONG'].includes(
          result.error.code ?? '',
        )
      ) {
        fieldErrors.value.newPassword = '密码长度需为 6～128 位';
      } else if (
        ['SESSION_EXPIRED', 'SESSION_NOT_FRESH'].includes(
          result.error.code ?? '',
        )
      ) {
        passwordError.value = '请重新登录后再修改密码';
      } else {
        passwordError.value = '修改失败，请稍后重试';
      }
      return;
    }

    passwords.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    };
    successToast('密码已修改');
    emit('saved');
  } catch {
    if (!requestController.signal.aborted) {
      passwordError.value = '修改失败，请检查网络后重试';
    }
  } finally {
    if (controller === requestController) {
      pending.value = null;
      controller = undefined;
    }
  }
};
</script>
