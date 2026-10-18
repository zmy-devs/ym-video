<template>
  <main class="min-h-svh grid lg:grid-cols-2">
    <div class="flex flex-col gap-4 p-6 md:p-10">
      <div
        class="flex items-center justify-center gap-2 font-medium md:justify-start"
      >
        <img :src="icon" alt="" class="size-6 rounded-md" />
        <span>Ym Video</span>
      </div>
      <div class="flex flex-1 items-center justify-center">
        <form
          aria-labelledby="login-heading"
          class="w-full max-w-xs flex flex-col gap-6"
          :aria-busy="pending"
          @submit.prevent="handleSubmit"
        >
          <header class="flex flex-col items-center gap-2 text-center">
            <h1 id="login-heading" class="text-2xl font-bold">欢迎回来</h1>
            <p class="text-sm text-balance text-muted-foreground">
              使用账号和密码登录 Ym Video
            </p>
          </header>
          <div class="grid gap-2">
            <Label for="login-account">账号</Label>
            <Input
              id="login-account"
              v-model="account"
              name="username"
              autocomplete="username"
              placeholder="请输入用户名或邮箱"
              :disabled="pending"
              :aria-invalid="!!error"
              :aria-describedby="error ? 'login-error' : undefined"
              required
            />
          </div>
          <div class="grid gap-2">
            <Label for="login-password">密码</Label>
            <Input
              id="login-password"
              v-model="password"
              name="password"
              type="password"
              autocomplete="current-password"
              placeholder="请输入密码"
              :disabled="pending"
              :aria-invalid="!!error"
              :aria-describedby="error ? 'login-error' : undefined"
              required
            />
          </div>
          <p
            v-if="error"
            id="login-error"
            role="alert"
            class="text-sm text-destructive"
          >
            {{ error }}
          </p>
          <Button type="submit" :disabled="pending">
            <LoaderCircle
              v-if="pending"
              class="size-4 animate-spin"
              aria-hidden="true"
            />
            {{ pending ? '正在登录…' : '登录' }}
          </Button>
        </form>
      </div>
    </div>
    <div class="relative hidden bg-muted lg:block" aria-hidden="true">
      <img
        :src="loginImage"
        alt=""
        width="1200"
        height="1200"
        class="size-full absolute inset-0 object-cover dark:brightness-[0.2] dark:grayscale"
      />
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { LoaderCircle } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn } from '@/services/auth';
import { getLoginReturnPath } from '@/lib/auth';
import loginImage from '@/assets/login-placeholder.svg';
import icon from '@/assets/icon.png';

// 登录前的目标页面通过站内回跳参数恢复。
const route = useRoute();

// 登录成功后替换登录记录，避免后退再次进入表单。
const router = useRouter();

// 账号支持用户名或邮箱，不在浏览器存储账号凭证。
const account = ref('');

// 密码只保存在当前表单内存中。
const password = ref('');

// 提交期间阻止重复请求。
const pending = ref(false);

// 当前登录失败原因。
const error = ref('');

// 通过 Better Auth 建立 Cookie 会话，成功后返回业务页面。
const handleSubmit = async () => {
  if (pending.value) {
    return;
  }

  pending.value = true;
  error.value = '';

  try {
    // 两种登录方式共用 Better Auth 的 Cookie 会话。
    const result = await signIn(account.value, password.value);

    if (result.error) {
      error.value = [
        'INVALID_EMAIL_OR_PASSWORD',
        'INVALID_USERNAME_OR_PASSWORD',
        'INVALID_USERNAME',
        'USERNAME_TOO_SHORT',
        'USERNAME_TOO_LONG',
      ].includes(result.error.code ?? '')
        ? '账号或密码不正确，请重新输入'
        : result.error.message || '登录失败，请稍后重试';

      return;
    }

    password.value = '';

    await router.replace(getLoginReturnPath(route.query.redirect));
  } catch {
    error.value = '无法连接账号服务，请稍后重试';
  } finally {
    pending.value = false;
  }
};
</script>
