<template>
  <main
    class="min-h-full flex items-center justify-center bg-muted p-4 dark:bg-background sm:p-8"
  >
    <Card
      class="w-full max-w-md rounded-2xl px-6 py-8 shadow-xl sm:px-10 sm:py-10"
    >
      <header class="mb-7 grid justify-items-center gap-3 text-center">
        <img :src="icon" class="size-16 rounded-xl" />
        <div class="grid gap-1.5">
          <h1 class="text-2xl font-bold">创建你的账号</h1>
          <p class="text-sm text-muted-foreground">请输入管理员提供的邀请码</p>
        </div>
      </header>

      <div v-if="session.data?.user" class="grid gap-5">
        <p class="text-center text-sm text-muted-foreground">
          当前已登录，请先退出当前账号再注册。
        </p>
        <Button class="h-10 w-full" :disabled="pending" @click="handleSignOut">
          {{ pending ? '正在退出…' : '退出当前账号并注册' }}
        </Button>
      </div>
      <form
        v-else
        class="grid gap-5"
        novalidate
        @submit.prevent="handleRegister"
      >
        <Field
          id="register-code"
          v-slot="{ control }"
          label="邀请码"
          :error="fieldErrors.code"
        >
          <Input
            v-bind="control"
            v-model="draft.code"
            required
            maxlength="128"
            autocomplete="one-time-code"
            placeholder="请输入邀请码"
            :disabled="pending"
            @update:model-value="clearError('code')"
          />
        </Field>
        <Field
          id="register-email"
          v-slot="{ control }"
          label="邮箱"
          :error="fieldErrors.email"
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
            @update:model-value="clearError('email')"
          />
        </Field>
        <Field
          id="register-username"
          v-slot="{ control }"
          label="用户名"
          :error="fieldErrors.username"
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
            @update:model-value="clearError('username')"
          />
        </Field>
        <Field
          id="register-password"
          v-slot="{ control }"
          label="密码"
          :error="fieldErrors.password"
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
            @update:model-value="clearError('password')"
          />
        </Field>
        <Field
          id="register-confirm"
          v-slot="{ control }"
          label="确认密码"
          :error="fieldErrors.confirmPassword"
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
            @update:model-value="clearError('confirmPassword')"
          />
        </Field>
        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
        <Button type="submit" class="h-10 w-full" :disabled="pending">
          <LoaderCircle v-if="pending" class="size-4 animate-spin" />
          {{ pending ? '正在注册…' : '注册并登录' }}
        </Button>
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
import { ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { LoaderCircle } from 'lucide-vue-next';
import { Button } from '@ym-video/ui/components/button';
import { Input } from '@ym-video/ui/components/input';
import { Card } from '@ym-video/ui/components/card';
import Field from '@ym-video/ui/common/field.vue';
import { registrationSchema } from '@ym-video/account/schema';
import { registerInvitation } from '@/services/invitations';
import { authClient, signIn } from '@/services/auth';
import icon from '../../../../assets/icon.png';

const router = useRouter();
const session = authClient.useSession();
const draft = ref({
  code: '',
  email: '',
  username: '',
  password: '',
  confirmPassword: '',
});
const pending = ref(false);
const error = ref('');
const fieldErrors = ref<Partial<Record<keyof typeof draft.value, string>>>({});

// 修改输入时只清除对应字段的上一条校验错误。
const clearError = (field: keyof typeof draft.value) => {
  delete fieldErrors.value[field];
  error.value = '';
};

// 退出当前账号后保留注册表单。
const handleSignOut = async () => {
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

// 邀请码和账号字段一次提交，注册成功后自动建立会话。
const handleRegister = async () => {
  if (pending.value) {
    return;
  }
  const result = registrationSchema.safeParse(draft.value);
  fieldErrors.value = result.success
    ? {}
    : Object.fromEntries(
        result.error.issues.map((issue) => [issue.path[0], issue.message]),
      );
  error.value = '';
  if (!result.success) {
    return;
  }

  pending.value = true;
  try {
    await registerInvitation(result.data);
    const signedIn = await signIn(result.data.email, result.data.password);
    if (signedIn.error) {
      throw new Error('账号已创建，请前往登录页重试');
    }
    draft.value.password = '';
    draft.value.confirmPassword = '';
    await router.replace('/overview');
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '注册失败，请重试';
    draft.value.password = '';
    draft.value.confirmPassword = '';
  } finally {
    pending.value = false;
  }
};
</script>
