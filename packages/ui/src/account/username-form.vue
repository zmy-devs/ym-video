<template>
  <form class="grid gap-6" novalidate @submit.prevent="handleUsername">
    <Field
      id="settings-username"
      v-slot="{ control }"
      label="用户名"
      :error="fieldErrors.username"
      :disabled="!!pending"
    >
      <Input
        v-bind="control"
        v-model="username"
        required
        minlength="3"
        maxlength="30"
        autocomplete="username"
        placeholder="请输入用户名"
        :disabled="!!pending"
        @update:model-value="handleFieldChange"
      />
    </Field>
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
import { LoaderCircle } from 'lucide-vue-next';
import { Button } from '@ym-video/ui/components/button';
import { Input } from '@ym-video/ui/components/input';
import { DialogFooter } from '@ym-video/ui/components/dialog';
import { FieldError } from '@ym-video/ui/components/field';
import Field from '@ym-video/ui/common/field.vue';
import type { AccountClient } from '@ym-video/account/client';
import { usernameSchema } from '@ym-video/account/schema';
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

// 用户名草稿来自当前账号，历史账号允许补齐用户名。
const username = ref(session.value.data?.user.username ?? '');

// 只在用户名有变更时允许提交，大小写由服务端统一规范化。
const usernameChanged = computed(
  () =>
    username.value.trim().toLowerCase() !==
    (session.value.data?.user.username ?? ''),
);

// 字段错误显示在用户名输入旁。
const fieldErrors = ref<{ username?: string }>({});

// 请求失败时保留草稿并显示原因。
const usernameError = ref('');

// 表单销毁时取消请求，丢弃迟到反馈。
let controller: AbortController | undefined;

onScopeDispose(() => {
  controller?.abort();
  controller = undefined;
  pending.value = null;
});

// 编辑时清除用户名的旧反馈。
const handleFieldChange = () => {
  fieldErrors.value = {};
  usernameError.value = '';
};

// 同步修改用户名和展示名，复用 Better Auth 的判重与会话刷新。
const handleUsername = async () => {
  if (pending.value || !usernameChanged.value) {
    return;
  }

  // 与服务端默认的用户名规范化保持一致。
  const value = username.value.trim().toLowerCase();

  fieldErrors.value = {};
  usernameError.value = '';
  const result = usernameSchema.safeParse(value);
  if (!result.success) {
    fieldErrors.value.username = result.error.issues[0]?.message;
    return;
  }

  pending.value = 'username';

  // 禁止自动重试写入，离开弹窗时可取消本次客户端请求。
  const requestController = new AbortController();

  controller = requestController;
  try {
    // 原生接口仅更新当前会话用户，不接收客户端指定的用户 ID。
    const result = await props.client.updateUser(
      { username: value, name: value },
      { signal: requestController.signal, retry: 0 },
    );

    requestController.signal.throwIfAborted();
    if (result.error) {
      if (result.error.code === 'USERNAME_IS_ALREADY_TAKEN') {
        fieldErrors.value.username = '该用户名已被使用，请换一个';
      } else if (
        [
          'INVALID_USERNAME',
          'USERNAME_TOO_SHORT',
          'USERNAME_TOO_LONG',
        ].includes(result.error.code ?? '')
      ) {
        fieldErrors.value.username =
          '用户名需为 3～30 位中英文、数字、下划线或句点';
      } else {
        usernameError.value = '保存失败，请稍后重试';
      }
      return;
    }

    username.value = value;
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
};
</script>
