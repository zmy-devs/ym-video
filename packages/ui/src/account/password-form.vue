<template>
  <form class="grid gap-6" novalidate @submit="handlePassword">
    <FieldGroup>
      <VeeField
        v-for="field in passwordFields"
        :key="field.key"
        v-slot="{ componentField, errors }"
        :name="field.key"
      >
        <Field
          :id="`settings-${field.key}`"
          v-slot="{ control }"
          :label="field.label"
          :error="errors[0]"
          :disabled="!!pending"
        >
          <Input
            v-bind="{ ...componentField, ...control }"
            type="password"
            required
            maxlength="128"
            :autocomplete="field.autocomplete"
            :placeholder="field.placeholder"
            :disabled="!!pending"
            @update:model-value="passwordError = ''"
          />
        </Field>
      </VeeField>
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
import { Field as VeeField, useForm } from 'vee-validate';
import { LoaderCircle } from 'lucide-vue-next';
import { Button } from '@ym-video/ui/components/button';
import { Input } from '@ym-video/ui/components/input';
import { DialogFooter } from '@ym-video/ui/components/dialog';
import { FieldGroup, FieldError } from '@ym-video/ui/components/field';
import Field from '@ym-video/ui/common/field.vue';
import type { AccountClient } from '@ym-video/account/client';
import { passwordChangeSchema } from '@ym-video/account/schema';
import { successToast } from '@ym-video/ui/lib/toast';

// 两端的密码弹窗复用同一套表单、校验和提交。
const props = defineProps<{ client: AccountClient }>();

// 密码修改期间阻止重复操作。
const pending = defineModel<'username' | 'password' | null>('pending', {
  required: true,
});

// 修改成功后交给调用方关闭弹窗。
const emit = defineEmits<{ saved: [] }>();

// 表单统一校验密码关系，密码保留原始输入。
const { handleSubmit, resetForm, setFieldError } = useForm({
  validationSchema: passwordChangeSchema,
  initialValues: {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  },
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

// 接口失败时保留当前输入供用户修正。
const passwordError = ref('');

// 关闭表单后取消尚未完成的请求。
let controller: AbortController | undefined;

onScopeDispose(() => {
  controller?.abort();
  controller = undefined;
  pending.value = null;
});

// 校验当前密码后修改凭据，同时撤销其他登录会话。
const handlePassword = handleSubmit(async (values) => {
  if (pending.value) {
    return;
  }

  passwordError.value = '';
  pending.value = 'password';

  // 密码只通过当前会话的原生接口提交，不保存到浏览器存储。
  const requestController = new AbortController();

  controller = requestController;
  try {
    // 成功响应会携带当前设备的新会话 Cookie。
    const result = await props.client.changePassword(
      {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        revokeOtherSessions: true,
      },
      { signal: requestController.signal, retry: 0 },
    );

    requestController.signal.throwIfAborted();
    if (result.error) {
      if (result.error.code === 'INVALID_PASSWORD') {
        setFieldError('currentPassword', '当前密码不正确，请重新输入');
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

    resetForm();
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
});
</script>
