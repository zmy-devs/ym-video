<template>
  <main
    class="flex min-h-svh items-center justify-center bg-muted p-4 dark:bg-background sm:p-8"
  >
    <Card
      aria-labelledby="invite-heading"
      class="w-full max-w-md rounded-2xl px-6 py-8 shadow-xl sm:px-10 sm:py-10"
    >
      <header class="mb-7 grid justify-items-center gap-3 text-center">
        <img :src="icon" alt="" class="size-16 rounded-xl" />
        <div class="grid gap-1.5">
          <h1 id="invite-heading" class="text-2xl font-bold">
            {{ registered ? '账号已创建' : '创建你的账号' }}
          </h1>
          <p class="text-sm text-muted-foreground">
            {{
              registered
                ? '注册成功，使用新账号登录即可开始观看。'
                : '你已受邀加入 Ym Video'
            }}
          </p>
        </div>
      </header>

      <p
        v-if="checking"
        role="status"
        class="text-center text-sm text-muted-foreground"
      >
        正在检查邀请链接…
      </p>
      <div v-else-if="registered" class="grid gap-5">
        <p v-if="error" role="alert" class="text-sm text-destructive">
          {{ error }}
        </p>
        <Button as-child class="h-10 w-full">
          <RouterLink to="/login">前往登录</RouterLink>
        </Button>
      </div>
      <div v-else-if="invitationError" class="grid gap-5">
        <p role="alert" class="text-center text-sm text-destructive">
          {{ invitationError }}
        </p>
        <Button
          v-if="retryable"
          type="button"
          variant="outline"
          class="h-10 w-full"
          @click="checkInvitation"
        >
          重试
        </Button>
        <Button as-child variant="outline" class="h-10 w-full">
          <RouterLink to="/login">返回登录</RouterLink>
        </Button>
      </div>
      <div v-else-if="session.data?.user" class="grid gap-5">
        <p class="text-center text-sm text-muted-foreground">
          当前已登录
          {{
            session.data.user.username || session.data.user.name
          }}，请先退出当前账号再注册。
        </p>
        <p v-if="error" role="alert" class="text-sm text-destructive">
          {{ error }}
        </p>
        <Button
          type="button"
          class="h-10 w-full"
          :disabled="pending"
          @click="handleSignOut"
        >
          {{ pending ? '正在退出…' : '退出当前账号并注册' }}
        </Button>
      </div>
      <form
        v-else
        class="grid gap-7"
        :aria-busy="pending"
        novalidate
        @submit.prevent="handleRegister"
      >
        <div class="grid gap-5">
          <FormField
            id="invite-email"
            v-slot="{ control }"
            label="邮箱"
            :error="fieldErrors.email"
            :disabled="pending"
          >
            <Input
              v-bind="control"
              v-model="draft.email"
              type="email"
              required
              maxlength="254"
              autocomplete="email"
              placeholder="请输入邮箱"
              :disabled="pending"
              @update:model-value="handleFieldChange('email')"
            />
          </FormField>
          <FormField
            id="invite-username"
            v-slot="{ control }"
            label="用户名"
            :error="fieldErrors.username"
            :disabled="pending"
          >
            <Input
              v-bind="control"
              v-model="draft.username"
              required
              minlength="3"
              maxlength="30"
              autocomplete="username"
              placeholder="请输入用户名"
              :disabled="pending"
              @update:model-value="handleFieldChange('username')"
            />
          </FormField>
          <FormField
            id="invite-password"
            v-slot="{ control }"
            label="密码"
            :error="fieldErrors.password"
            :disabled="pending"
          >
            <Input
              v-bind="control"
              v-model="draft.password"
              type="password"
              required
              minlength="6"
              maxlength="128"
              autocomplete="new-password"
              placeholder="请输入密码"
              :disabled="pending"
              @update:model-value="handleFieldChange('password')"
            />
          </FormField>
          <FormField
            id="invite-confirm"
            v-slot="{ control }"
            label="确认密码"
            :error="fieldErrors.confirmPassword"
            :disabled="pending"
          >
            <Input
              v-bind="control"
              v-model="draft.confirmPassword"
              type="password"
              required
              minlength="6"
              maxlength="128"
              autocomplete="new-password"
              placeholder="请再次输入密码"
              :disabled="pending"
              @update:model-value="handleFieldChange('confirmPassword')"
            />
          </FormField>
          <p v-if="error" role="alert" class="text-sm text-destructive">
            {{ error }}
          </p>
          <Button
            type="submit"
            class="h-10 w-full"
            :disabled="pending || session.isPending"
          >
            <LoaderCircle
              v-if="pending"
              class="size-4 animate-spin"
              aria-hidden="true"
            />
            {{ pending ? '正在注册…' : '注册并登录' }}
          </Button>
        </div>
        <p class="text-center text-sm text-muted-foreground">
          已有账号？
          <Button as-child variant="link" class="h-auto p-0 text-sm">
            <RouterLink to="/login">前往登录</RouterLink>
          </Button>
        </p>
      </form>
    </Card>
  </main>
</template>

<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { LoaderCircle } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import FormField from '@/components/common/form-field.vue';
import { AccountRequestError, accountRequest } from '@/services/admin';
import { getAccountFieldErrors, validateAccountForm } from '@/lib/account-form';
import type { AccountFieldErrors } from '@/lib/account-form';
import { isRecord } from '@/services/api';
import { authClient, signIn } from '@/services/auth';
import icon from '@/assets/icon.png';

// 公开页面不依赖登录，但已登录时要求主动退出后再创建身份。
const route = useRoute();
const router = useRouter();
const session = authClient.useSession();
const draft = ref({
  email: '',
  username: '',
  password: '',
  confirmPassword: '',
});
// 邀请检查失败与注册失败分开显示，避免网络故障被误报为链接失效。
const checking = ref(true);
const invitationError = ref('');
const retryable = ref(false);
const pending = ref(false);
const registered = ref(false);
const error = ref('');
// 错误替换对应字段的标题，避免校验后挤动输入框。
const fieldErrors = ref<AccountFieldErrors>({});
let controller: AbortController | undefined;
// 路由切换后，旧注册请求不能覆盖新邀请的表单或触发登录跳转。
let revision = 0;

// 切换邀请时取消旧查询，并清除包含密码的上一份草稿。
const checkInvitation = async () => {
  controller?.abort();
  const current = new AbortController();
  controller = current;
  checking.value = true;
  invitationError.value = '';
  try {
    const response = await fetch(
      `/api/v1/invitations/${encodeURIComponent(String(route.params.token))}`,
      { credentials: 'include', signal: current.signal },
    );
    const body: unknown = await response.json();
    if (current.signal.aborted) {
      return;
    }
    retryable.value = response.status !== 404;
    if (!response.ok) {
      throw new Error(
        isRecord(body) && typeof body.message === 'string'
          ? body.message
          : '无法检查邀请链接，请重试',
      );
    }
    retryable.value = false;
    if (!isRecord(body) || !['unused', 'used'].includes(String(body.status))) {
      retryable.value = true;
      throw new Error('邀请信息格式不正确，请重试');
    }
    if (body.status === 'used') {
      invitationError.value = '此邀请链接已使用，无法再次注册';
    }
  } catch (cause) {
    if (!current.signal.aborted) {
      invitationError.value =
        cause instanceof Error ? cause.message : '无法连接服务，请重试';
      if (cause instanceof TypeError) {
        retryable.value = true;
      }
    }
  } finally {
    if (!current.signal.aborted) {
      checking.value = false;
    }
  }
};

watch(
  () => route.params.token,
  () => {
    revision += 1;
    pending.value = false;
    draft.value = {
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
    };
    registered.value = false;
    error.value = '';
    fieldErrors.value = {};
    return checkInvitation();
  },
  { immediate: true },
);
onUnmounted(() => {
  revision += 1;
  controller?.abort();
  draft.value.password = '';
  draft.value.confirmPassword = '';
});

// 主动退出后保持当前邀请路由，允许填写新账号。
const handleSignOut = async () => {
  if (pending.value) {
    return;
  }
  pending.value = true;
  error.value = '';
  try {
    const result = await authClient.signOut();
    if (result.error) {
      throw new Error(result.error.message || '退出失败，请重试');
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '退出失败，请重试';
  } finally {
    pending.value = false;
  }
};
// 修改字段时清除该字段的上一条校验反馈。
const handleFieldChange = (field: keyof AccountFieldErrors) => {
  delete fieldErrors.value[field];
  error.value = '';
};

// 只有账号和邀请原子提交成功后才执行自动登录，登录失败不重复注册。
const handleRegister = async () => {
  if (pending.value) {
    return;
  }
  error.value = '';
  fieldErrors.value = validateAccountForm(draft.value, true);
  if (Object.keys(fieldErrors.value).length) {
    return;
  }
  const currentRevision = revision;
  const token = String(route.params.token);
  const input = { ...draft.value };
  pending.value = true;
  try {
    await accountRequest(`/invitations/${encodeURIComponent(token)}/register`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (revision !== currentRevision) {
      return;
    }
    registered.value = true;
    const result = await signIn(input.email, input.password);
    if (revision !== currentRevision) {
      return;
    }
    draft.value.password = '';
    draft.value.confirmPassword = '';
    if (result.error) {
      error.value = '账号已创建，自动登录失败，请前往登录页重试';
      return;
    }
    await router.replace('/overview');
  } catch (cause) {
    if (revision !== currentRevision) {
      return;
    }
    if (registered.value) {
      error.value = '账号已创建，请前往登录页重试';
    } else {
      if (cause instanceof AccountRequestError) {
        fieldErrors.value = getAccountFieldErrors(cause.code, cause.message);
      }
      if (!Object.keys(fieldErrors.value).length) {
        error.value =
          cause instanceof Error ? cause.message : '注册失败，请重试';
      }
    }
    if (registered.value) {
      draft.value.password = '';
      draft.value.confirmPassword = '';
    }
  } finally {
    if (revision === currentRevision) {
      pending.value = false;
    }
  }
};
</script>
