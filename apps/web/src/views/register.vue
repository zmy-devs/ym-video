<template>
  <main
    class="min-h-full flex items-center justify-center bg-muted p-4 dark:bg-background sm:p-8"
  >
    <Card
      class="w-full max-w-md rounded-2xl px-6 py-8 shadow-xl sm:px-10 sm:py-10"
    >
      <header class="mb-7 grid justify-items-center gap-3 text-center">
        <img :src="icon" alt="Ym Video" class="size-16 rounded-xl" />
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
      <form v-else class="grid gap-5" novalidate @submit="handleRegister">
        <VeeField v-slot="{ componentField, errors }" name="code">
          <Field
            id="register-code"
            v-slot="{ control }"
            label="邀请码"
            :error="errors[0]"
          >
            <Input
              v-bind="{ ...componentField, ...control }"
              required
              maxlength="128"
              autocomplete="one-time-code"
              placeholder="请输入邀请码"
              :disabled="pending"
              @update:model-value="error = ''"
            />
          </Field>
        </VeeField>
        <VeeField v-slot="{ componentField, errors }" name="email">
          <Field
            id="register-email"
            v-slot="{ control }"
            label="邮箱"
            :error="errors[0]"
          >
            <Input
              v-bind="{ ...componentField, ...control }"
              type="email"
              required
              maxlength="254"
              autocomplete="email"
              placeholder="请输入邮箱"
              :disabled="pending"
              @update:model-value="error = ''"
            />
          </Field>
        </VeeField>
        <VeeField v-slot="{ componentField, errors }" name="username">
          <Field
            id="register-username"
            v-slot="{ control }"
            label="用户名"
            :error="errors[0]"
          >
            <Input
              v-bind="{ ...componentField, ...control }"
              required
              minlength="3"
              maxlength="30"
              autocomplete="username"
              placeholder="请输入用户名"
              :disabled="pending"
              @update:model-value="error = ''"
            />
          </Field>
        </VeeField>
        <VeeField v-slot="{ componentField, errors }" name="password">
          <Field
            id="register-password"
            v-slot="{ control }"
            label="密码"
            :error="errors[0]"
          >
            <Input
              v-bind="{ ...componentField, ...control }"
              type="password"
              required
              minlength="6"
              maxlength="128"
              autocomplete="new-password"
              placeholder="请输入密码"
              :disabled="pending"
              @update:model-value="error = ''"
            />
          </Field>
        </VeeField>
        <VeeField v-slot="{ componentField, errors }" name="confirmPassword">
          <Field
            id="register-confirm"
            v-slot="{ control }"
            label="确认密码"
            :error="errors[0]"
          >
            <Input
              v-bind="{ ...componentField, ...control }"
              type="password"
              required
              minlength="6"
              maxlength="128"
              autocomplete="new-password"
              placeholder="请再次输入密码"
              :disabled="pending"
              @update:model-value="error = ''"
            />
          </Field>
        </VeeField>
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
import { Field as VeeField, useForm } from 'vee-validate';
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

// 注册后进入客户端概览。
const router = useRouter();

// 已登录时先展示退出账号入口。
const session = authClient.useSession();

// 邀请与账号字段由同一份共享 schema 校验。
const {
  handleSubmit,
  setFieldValue,
  isSubmitting: pending,
} = useForm({
  validationSchema: registrationSchema,
  initialValues: {
    code: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  },
});

// 请求失败保留服务端反馈。
const error = ref('');

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
const handleRegister = handleSubmit(async (values) => {
  error.value = '';

  try {
    await registerInvitation(values);
    const signedIn = await signIn(values.email, values.password);
    if (signedIn.error) {
      throw new Error('账号已创建，请前往登录页重试');
    }
    await router.replace('/overview');
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '注册失败，请重试';
  } finally {
    setFieldValue('password', '', false);
    setFieldValue('confirmPassword', '', false);
  }
});
</script>
