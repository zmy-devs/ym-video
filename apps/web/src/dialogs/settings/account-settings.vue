<template>
  <section class="flex flex-col gap-8">
    <form novalidate @submit.prevent="handleUsername">
      <h2 class="border-b px-4 py-3 text-sm">账号信息</h2>
      <div class="min-h-17.5 flex items-center gap-6 px-4 py-3 text-sm">
        <div class="min-w-0 flex-1 space-y-1">
          <h3 class="font-medium">邮箱</h3>
          <p class="text-muted-foreground">当前账号的邮箱地址</p>
        </div>
        <p class="w-60 truncate text-right" :title="session.data?.user.email">
          {{ session.data?.user.email }}
        </p>
      </div>
      <SettingsField
        id="settings-username"
        v-slot="{ control }"
        label="用户名"
        description="3～30 位中英文、数字、下划线或句点"
        :error="fieldErrors.username"
      >
        <InputGroup class="w-60 shrink-0" :data-disabled="!!pending">
          <InputGroupInput
            v-bind="control"
            v-model="username"
            required
            minlength="3"
            maxlength="30"
            autocomplete="username"
            placeholder="请输入用户名"
            :disabled="!!pending"
            @update:model-value="handleFieldChange('username')"
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              type="submit"
              variant="default"
              class="text-xs"
              aria-label="保存用户名"
              :disabled="!!pending || !usernameChanged"
            >
              <LoaderCircle
                v-if="pending === 'username'"
                class="animate-spin"
              />
              {{ pending === 'username' ? '保存中…' : '保存' }}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </SettingsField>
      <p
        v-if="usernameError"
        role="alert"
        class="px-4 text-sm text-destructive"
      >
        {{ usernameError }}
      </p>
    </form>
    <form novalidate @submit.prevent="handlePassword">
      <h2 class="border-b px-4 py-3 text-sm">修改密码</h2>
      <SettingsField
        v-for="field in passwordFields"
        :id="`settings-${field.key}`"
        :key="field.key"
        v-slot="{ control }"
        :label="field.label"
        :description="field.description"
        :error="fieldErrors[field.key]"
      >
        <Input
          v-bind="control"
          v-model="passwords[field.key]"
          class="w-60 shrink-0"
          type="password"
          required
          maxlength="128"
          :autocomplete="field.autocomplete"
          :placeholder="field.placeholder"
          :disabled="!!pending"
          @update:model-value="handleFieldChange(field.key)"
        />
      </SettingsField>
      <p
        v-if="passwordError"
        role="alert"
        class="px-4 text-sm text-destructive"
      >
        {{ passwordError }}
      </p>
      <div class="flex items-center justify-between gap-6 px-4 py-3">
        <p class="text-sm text-muted-foreground">
          修改后，其他设备需要重新登录
        </p>
        <Button type="submit" size="sm" variant="default" :disabled="!!pending">
          <LoaderCircle v-if="pending === 'password'" class="animate-spin" />
          {{ pending === 'password' ? '正在修改…' : '修改密码' }}
        </Button>
      </div>
    </form>
  </section>
</template>
<script setup lang="ts">
import { computed, onScopeDispose, ref } from 'vue';
import { LoaderCircle } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import SettingsField from './settings-field.vue';
import { authClient } from '@/services/auth';
import { isValidUsername } from '@/lib/account-form';
import { successToast } from '@/utils/toast';

// 弹窗统一控制提交时的关闭和分类切换。
const pending = defineModel<'username' | 'password' | null>('pending', {
  required: true,
});

// 草稿只属于当前挂载的账号设置，关闭或切换分类即销毁。
const session = authClient.useSession();

// 用户名草稿来自当前账号，历史账号允许补齐用户名。
const username = ref(session.value.data?.user.username ?? '');

// 只在用户名有变更时允许提交，大小写由服务端统一规范化。
const usernameChanged = computed(
  () =>
    username.value.trim().toLowerCase() !==
    (session.value.data?.user.username ?? ''),
);

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
    description: '用于验证当前账号身份',
    autocomplete: 'current-password',
    placeholder: '请输入当前密码',
  },
  {
    key: 'newPassword',
    label: '新密码',
    description: '6～128 位，不能与当前密码相同',
    autocomplete: 'new-password',
    placeholder: '请输入新密码',
  },
  {
    key: 'confirmPassword',
    label: '确认新密码',
    description: '再次输入新密码，确保两次一致',
    autocomplete: 'new-password',
    placeholder: '再次输入新密码',
  },
] as const;

// 校验和接口字段错误显示在对应设置项内。
const fieldErrors = ref<
  Partial<Record<'username' | keyof typeof passwords.value, string>>
>({});

// 两个表单分别保留自己的整体请求反馈。
const usernameError = ref('');

// 修改密码失败不会影响用户名表单。
const passwordError = ref('');

// 关闭、切页和切账号后取消请求并丢弃迟到反馈。
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

// 编辑字段时仅清除所属表单的旧反馈。
const handleFieldChange = (
  field: 'username' | keyof typeof passwords.value,
) => {
  delete fieldErrors.value[field];
  if (field === 'username') {
    usernameError.value = '';
  } else {
    passwordError.value = '';
  }
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
  if (!isValidUsername(value)) {
    fieldErrors.value.username =
      '用户名需为 3～30 位中英文、数字、下划线或句点';
    return;
  }

  pending.value = 'username';

  // 禁止自动重试写入，离开弹窗时可取消本次客户端请求。
  const requestController = new AbortController();

  controller = requestController;
  try {
    // 原生接口仅更新当前会话用户，不接收客户端指定的用户 ID。
    const result = await authClient.updateUser(
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

// 校验当前密码后修改凭据，同时撤销其他登录会话。
const handlePassword = async () => {
  if (pending.value) {
    return;
  }

  fieldErrors.value = {};
  passwordError.value = '';
  if (!passwords.value.currentPassword) {
    fieldErrors.value.currentPassword = '请输入当前密码';
  }
  if (
    passwords.value.newPassword.length < 6 ||
    passwords.value.newPassword.length > 128
  ) {
    fieldErrors.value.newPassword = '密码长度需为 6～128 位';
  } else if (passwords.value.newPassword === passwords.value.currentPassword) {
    fieldErrors.value.newPassword = '新密码不能与当前密码相同';
  }
  if (passwords.value.newPassword !== passwords.value.confirmPassword) {
    fieldErrors.value.confirmPassword = '两次输入的密码不一致';
  }
  if (Object.keys(fieldErrors.value).length) {
    return;
  }

  pending.value = 'password';

  // 密码只通过当前会话的原生接口提交，不保存到浏览器存储。
  const requestController = new AbortController();

  controller = requestController;
  try {
    // 成功响应会携带当前设备的新会话 Cookie。
    const result = await authClient.changePassword(
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
