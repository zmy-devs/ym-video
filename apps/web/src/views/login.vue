<template>
  <main
    class="login-page min-h-full flex items-center justify-center bg-muted p-4 dark:bg-background sm:p-8"
  >
    <Card
      aria-labelledby="login-heading"
      class="w-full max-w-md rounded-2xl px-6 py-8 shadow-xl sm:px-10 sm:py-10"
    >
      <form
        class="grid gap-7"
        :aria-busy="pending"
        novalidate
        @submit.prevent="handleSubmit"
      >
        <header class="grid justify-items-center gap-3 text-center">
          <img :src="icon" alt="" class="size-16 rounded-xl" />
          <div class="grid gap-1.5">
            <h1 id="login-heading" class="text-2xl font-bold">欢迎回来</h1>
            <p class="text-sm text-muted-foreground">
              使用邮箱和密码登录 Ym Video
            </p>
          </div>
        </header>

        <div class="grid gap-5">
          <FormField
            id="login-email"
            v-slot="{ control }"
            label="邮箱"
            :error="emailError"
            :disabled="pending"
          >
            <Input
              v-bind="control"
              v-model="email"
              name="email"
              type="email"
              autocomplete="email"
              maxlength="254"
              placeholder="请输入邮箱"
              :disabled="pending"
              required
              @update:model-value="handleEmailInput"
            />
          </FormField>

          <FormField
            id="login-password"
            v-slot="{ control }"
            label="密码"
            :error="error"
            :disabled="pending"
          >
            <Input
              v-bind="control"
              v-model="password"
              name="password"
              type="password"
              autocomplete="current-password"
              placeholder="请输入密码"
              :disabled="pending"
              required
              @update:model-value="error = ''"
            />
          </FormField>

          <Button type="submit" class="h-10 w-full" :disabled="pending">
            <LoaderCircle
              v-if="pending"
              class="size-4 animate-spin"
              aria-hidden="true"
            />
            {{ pending ? '正在登录…' : '登录' }}
          </Button>
        </div>

        <p class="text-center text-sm text-muted-foreground">
          还没有账号？
          <Button
            type="button"
            variant="link"
            class="h-auto p-0 text-sm"
            @click="handleInvitationRegistration"
          >
            注册
          </Button>
        </p>
      </form>
    </Card>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { LoaderCircle } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import FormField from '@/components/common/form-field.vue';
import { signIn } from '@/services/auth';
import { getLoginReturnPath } from '@/lib/auth';
import { infoToast } from '@/utils/toast';
import icon from '@/assets/icon.svg';

// 登录前的目标页面通过站内回跳参数恢复。
const route = useRoute();

// 登录成功后替换登录记录，避免后退再次进入表单。
const router = useRouter();

// 仅通过邮箱登录，不在浏览器存储账号凭证。
const email = ref('');

// 密码只保存在当前表单内存中。
const password = ref('');

// 提交期间阻止重复请求。
const pending = ref(false);

// 当前登录失败原因。
const error = ref('');

// 邮箱校验错误显示在邮箱标题位置。
const emailError = ref('');

// 修改邮箱时清除上一次身份或凭据反馈。
const handleEmailInput = () => {
  emailError.value = '';
  error.value = '';
};

// 自由注册关闭，提示用户通过邀请链接创建账号。
const handleInvitationRegistration = () => infoToast('仅支持邀请注册');

// 通过 Better Auth 建立 Cookie 会话，成功后返回业务页面。
const handleSubmit = async () => {
  if (pending.value) {
    return;
  }

  emailError.value = '';
  if (!email.value.trim()) {
    emailError.value = '请输入邮箱';
  } else if (
    email.value.trim().length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email.value.trim())
  ) {
    emailError.value = '请输入有效的邮箱地址';
  }
  error.value = password.value ? '' : '请输入密码';
  if (emailError.value || error.value) {
    return;
  }

  pending.value = true;
  error.value = '';

  try {
    const result = await signIn(email.value, password.value);

    if (result.error) {
      if (result.error.status >= 500) {
        error.value = '账号服务暂时不可用，请稍后重试';
        return;
      }
      if (result.error.code === 'BANNED_USER') {
        error.value = '账号已停用，请联系管理员';
        return;
      }
      error.value =
        result.error.code === 'INVALID_EMAIL_OR_PASSWORD'
          ? '邮箱或密码不正确，请重新输入'
          : result.error.message || '登录失败，请稍后重试';

      return;
    }

    password.value = '';

    await router.replace(
      getLoginReturnPath(route.query.redirect, result.data?.user.role),
    );
  } catch {
    error.value = '无法连接账号服务，请稍后重试';
  } finally {
    pending.value = false;
  }
};
</script>
