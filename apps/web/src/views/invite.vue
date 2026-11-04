<template>
  <main
    class="min-h-full flex items-center justify-center bg-muted p-4 dark:bg-background sm:p-8"
  >
    <Card
      class="w-full max-w-md rounded-2xl px-6 py-8 shadow-xl sm:px-10 sm:py-10"
    >
      <header class="mb-7 grid justify-items-center gap-3 text-center">
        <img :src="icon" alt="" class="size-16 rounded-xl" />
        <div class="grid gap-1.5">
          <h1 id="invite-heading" class="text-2xl font-bold">创建你的账号</h1>
          <p class="text-sm text-muted-foreground">你已受邀加入 Ym Video</p>
        </div>
      </header>

      <p v-if="checking" class="text-center text-sm text-muted-foreground">
        正在检查邀请链接…
      </p>
      <div v-else-if="registered" class="grid gap-5">
        <p
          v-if="pending"
          class="flex items-center justify-center gap-2 text-sm text-muted-foreground"
        >
          <LoaderCircle class="size-4 animate-spin" />
          正在登录并进入页面…
        </p>
        <template v-else>
          <p v-if="error" class="text-sm text-destructive">
            {{ error }}
          </p>
          <Button as-child class="h-10 w-full">
            <RouterLink to="/login">前往登录</RouterLink>
          </Button>
        </template>
      </div>
      <div v-else-if="invitationError" class="grid gap-5">
        <p class="text-center text-sm text-destructive">
          {{ invitationError }}
        </p>
        <Button
          v-if="retryable"
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
        <p v-if="error" class="text-sm text-destructive">
          {{ error }}
        </p>
        <Button class="h-10 w-full" :disabled="pending" @click="handleSignOut">
          {{ pending ? '正在退出…' : '退出当前账号并注册' }}
        </Button>
      </div>
      <form
        v-else
        class="grid gap-7"
        novalidate
        @submit.prevent="handleRegister"
      >
        <div class="grid gap-5">
          <Field
            id="invite-email"
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
              autocomplete="email"
              placeholder="请输入邮箱"
              :disabled="pending"
              @update:model-value="handleFieldChange('email')"
            />
          </Field>
          <Field
            id="invite-username"
            v-slot="{ control }"
            label="用户名"
            :error="fieldErrors.username?.[0]"
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
          </Field>
          <Field
            id="invite-password"
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
              minlength="6"
              maxlength="128"
              autocomplete="new-password"
              placeholder="请输入密码"
              :disabled="pending"
              @update:model-value="handleFieldChange('password')"
            />
          </Field>
          <Field
            id="invite-confirm"
            v-slot="{ control }"
            label="确认密码"
            :error="fieldErrors.confirmPassword?.[0]"
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
          </Field>
          <p v-if="error" class="text-sm text-destructive">
            {{ error }}
          </p>
          <Button
            type="submit"
            class="h-10 w-full"
            :disabled="pending || session.isPending"
          >
            <LoaderCircle v-if="pending" class="size-4 animate-spin" />
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
import { computed, onUnmounted, ref } from 'vue';
import { watchImmediate } from '@vueuse/core';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { LoaderCircle } from 'lucide-vue-next';
import { Button } from '@ym-video/ui/components/button';
import { Input } from '@ym-video/ui/components/input';
import { Card } from '@ym-video/ui/components/card';
import Field from '@ym-video/ui/common/field.vue';
import { registerInvitation } from '@/services/invitations';
import { registrationSchema } from '@ym-video/account/schema';
import { isRecord } from '@/services/api';
import { authClient, signIn } from '@/services/auth';
import icon from '../../../../assets/icon.png';

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
const status = ref<
  | 'checking'
  | 'ready'
  | 'invalid'
  | 'signing-out'
  | 'registering'
  | 'signing-in'
  | 'registered'
>('checking');
const checking = computed(() => status.value === 'checking');
const pending = computed(() =>
  ['signing-out', 'registering', 'signing-in'].includes(status.value),
);
const registered = computed(
  () => status.value === 'signing-in' || status.value === 'registered',
);
const invitationError = ref('');
const retryable = ref(false);
const error = ref('');
// 错误替换对应字段的标题，避免校验后挤动输入框。
const fieldErrors = ref<Partial<Record<keyof typeof draft.value, string[]>>>(
  {},
);
let controller: AbortController | undefined;
// 路由切换后，旧注册请求不能覆盖新邀请的表单或触发登录跳转。
let revision = 0;

// 切换邀请时取消旧查询，并清除包含密码的上一份草稿。
const checkInvitation = async () => {
  controller?.abort();
  const current = new AbortController();
  controller = current;
  status.value = 'checking';
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
      status.value = invitationError.value ? 'invalid' : 'ready';
    }
  }
};

watchImmediate(
  () => route.params.token,
  () => {
    revision += 1;
    draft.value = {
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
    };
    error.value = '';
    fieldErrors.value = {};
    return checkInvitation();
  },
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
  status.value = 'signing-out';
  error.value = '';
  try {
    const result = await authClient.signOut();
    if (result.error) {
      throw new Error(result.error.message || '退出失败，请重试');
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '退出失败，请重试';
  } finally {
    status.value = 'ready';
  }
};
// 修改字段时清除该字段的上一条校验反馈。
const handleFieldChange = (field: keyof typeof draft.value) => {
  delete fieldErrors.value[field];
  error.value = '';
};

// 只有账号和邀请原子提交成功后才执行自动登录，登录失败不重复注册。
const handleRegister = async () => {
  if (pending.value) {
    return;
  }
  error.value = '';
  const result = registrationSchema.safeParse(draft.value);
  fieldErrors.value = result.success ? {} : result.error.flatten().fieldErrors;
  if (!result.success) {
    return;
  }
  const currentRevision = revision;
  const token = String(route.params.token);
  const input = result.data;
  status.value = 'registering';
  try {
    await registerInvitation(token, input);
    if (revision !== currentRevision) {
      return;
    }
    status.value = 'signing-in';
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
      error.value = cause instanceof Error ? cause.message : '注册失败，请重试';
    }
    if (registered.value) {
      draft.value.password = '';
      draft.value.confirmPassword = '';
    }
  } finally {
    if (revision === currentRevision) {
      status.value = registered.value ? 'registered' : 'ready';
    }
  }
};
</script>
