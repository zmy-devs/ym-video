<template>
  <form class="grid gap-6" novalidate @submit="handleUsername">
    <VeeField v-slot="{ componentField, errors }" name="username">
      <Field
        id="settings-username"
        v-slot="{ control }"
        label="用户名"
        :error="errors[0]"
        :disabled="!!pending"
      >
        <Input
          v-bind="{ ...componentField, ...control }"
          required
          minlength="3"
          maxlength="30"
          autocomplete="username"
          placeholder="请输入用户名"
          :disabled="!!pending"
          @update:model-value="usernameError = ''"
        />
      </Field>
    </VeeField>
    <FieldError v-if="usernameError" role="alert">{{
      usernameError
    }}</FieldError>
    <DialogFooter>
      <Button type="submit" :disabled="!!pending || !usernameChanged">
        <LoaderCircle v-if="pending === 'username'" class="animate-spin" />
        {{ pending === 'username' ? '保存中…' : '保存' }}
      </Button>
    </DialogFooter>
  </form>
</template>

<script setup lang="ts">
import { computed, onScopeDispose, ref } from 'vue';
import { Field as VeeField, useForm } from 'vee-validate';
import { LoaderCircle } from 'lucide-vue-next';
import { Button } from '@ym-video/ui/components/button';
import { Input } from '@ym-video/ui/components/input';
import { DialogFooter } from '@ym-video/ui/components/dialog';
import { FieldError } from '@ym-video/ui/components/field';
import Field from '@ym-video/ui/common/field.vue';
import type { AccountClient } from '@ym-video/account/client';
import { usernameFormSchema } from '@ym-video/account/schema';
import { successToast } from '@ym-video/ui/lib/toast';

// 用户名表单复用所属应用的账号客户端。
const props = defineProps<{ client: AccountClient }>();

// 账号设置共用提交状态，提交期间禁止重复保存。
const pending = defineModel<'username' | 'password' | null>('pending', {
  required: true,
});

// 保存成功后由调用方关闭编辑弹窗。
const emit = defineEmits<{ saved: [] }>();

// 用户名草稿以当前已确认会话为准。
const session = props.client.useSession();

// 表单读取当前用户名，并统一校验和规范化输入。
const { values, handleSubmit, setFieldError, setFieldValue } = useForm({
  validationSchema: usernameFormSchema,
  initialValues: { username: session.value.data?.user.username ?? '' },
});

// 只在用户名有变更时允许提交，大小写由服务端统一规范化。
const usernameChanged = computed(
  () =>
    values.username.trim().toLowerCase() !==
    (session.value.data?.user.username ?? ''),
);

// 请求失败时保留草稿并显示原因。
const usernameError = ref('');

// 表单销毁时取消请求，丢弃迟到反馈。
let controller: AbortController | undefined;

onScopeDispose(() => {
  controller?.abort();
  controller = undefined;
  pending.value = null;
});

// 同步修改用户名和展示名，复用 Better Auth 的判重与会话刷新。
const handleUsername = handleSubmit(async (input) => {
  if (pending.value || !usernameChanged.value) {
    return;
  }

  usernameError.value = '';
  pending.value = 'username';

  // 禁止自动重试写入，离开弹窗时可取消本次客户端请求。
  const requestController = new AbortController();

  controller = requestController;
  try {
    // 原生接口仅更新当前会话用户，不接收客户端指定的用户 ID。
    const result = await props.client.updateUser(
      { username: input.username, name: input.username },
      { signal: requestController.signal, retry: 0 },
    );

    requestController.signal.throwIfAborted();
    if (result.error) {
      if (result.error.code === 'USERNAME_IS_ALREADY_TAKEN') {
        setFieldError('username', '该用户名已被使用，请换一个');
      } else {
        usernameError.value = '保存失败，请稍后重试';
      }
      return;
    }

    setFieldValue('username', input.username, false);
    await session.value.refetch();
    requestController.signal.throwIfAborted();
    successToast('用户名已更新');
    emit('saved');
  } catch {
    if (!requestController.signal.aborted) {
      usernameError.value = '保存失败，请检查网络后重试';
    }
  } finally {
    if (controller === requestController) {
      pending.value = null;
      controller = undefined;
    }
  }
});
</script>
