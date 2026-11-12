<template>
  <main
    class="login-page min-h-full flex items-center justify-center bg-muted p-4 dark:bg-background sm:p-8"
  >
    <Card
      class="w-full max-w-md rounded-2xl px-6 py-8 shadow-xl sm:px-10 sm:py-10"
    >
      <form class="grid gap-7" novalidate @submit.prevent="handleSubmit">
        <header class="grid justify-items-center gap-3 text-center">
          <img :src="icon" class="size-16 rounded-xl" />
          <div class="grid gap-1.5">
            <h1 id="login-heading" class="text-2xl font-bold">
              {{ loginTitle }}
            </h1>
            <p class="text-sm text-muted-foreground">
              {{ loginDescription }}
            </p>
          </div>
        </header>

        <div class="grid gap-5">
          <Field
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
              :placeholder="emailPlaceholder"
              :disabled="pending"
              required
              @update:model-value="handleInput"
            />
          </Field>

          <Field
            id="login-password"
            v-slot="{ control }"
            label="密码"
            :error="passwordError"
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
              @update:model-value="handleInput"
            />
          </Field>

          <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

          <Button type="submit" class="h-10 w-full" :disabled="pending">
            <LoaderCircle v-if="pending" class="size-4 animate-spin" />
            {{ submitLabel }}
          </Button>
        </div>

        <slot name="footer" />
      </form>
    </Card>
  </main>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { RouteRecordName } from 'vue-router';
import { z } from 'zod';
import { LoaderCircle } from 'lucide-vue-next';
import { Button } from '@ym-video/ui/components/button';
import { Card } from '@ym-video/ui/components/card';
import { Input } from '@ym-video/ui/components/input';
import Field from '@ym-video/ui/common/field.vue';
import type { AccountClient } from '@ym-video/account/client';
import { getLoginRedirect } from '@ym-video/account/navigation';
import { emailSchema } from '@ym-video/account/schema';
import { retryRequest } from '@ym-video/account/request-retry';

// 两个应用共用表单与认证流程，应用只声明目标角色和首页。
const props = defineProps<{
  client: AccountClient;
  role: 'user' | 'admin';
  homeRoute: RouteRecordName;
  icon: string;
}>();

// 根据当前应用的目标角色展示登录标题与提交状态。
const isAdmin = computed(() => props.role === 'admin');

// 登录文案根据当前应用的目标角色生成。
const loginTitle = computed(() => (isAdmin.value ? '管理员登录' : '欢迎回来'));

// 登录说明根据当前应用的使用场景生成。
const loginDescription = computed(() =>
  isAdmin.value
    ? '使用管理员账号管理用户和邀请'
    : '使用邮箱和密码登录 Ym Video',
);

// 邮箱占位提示根据当前应用的目标角色生成。
const emailPlaceholder = computed(() =>
  isAdmin.value ? '请输入管理员邮箱' : '请输入邮箱',
);

// 提交按钮名称跟随等待状态和目标角色。
const submitLabel = computed(() => {
  if (pending.value) {
    return '正在登录…';
  }

  return isAdmin.value ? '登录管理后台' : '登录';
});

// 登录前的目标页面通过站内回跳参数恢复。
const route = useRoute();

// 登录成功后替换登录记录，避免后退再次进入表单。
const router = useRouter();

// 登录后刷新当前应用所持有的认证会话。
const session = props.client.useSession();

// 仅通过邮箱登录，不在浏览器存储账号凭证。
const email = ref('');

// 密码只保存在当前表单内存中。
const password = ref('');

// 提交期间阻止重复请求。
const pending = ref(false);

// 离开登录页时取消持续重试的请求。
const loginController = new AbortController();
onUnmounted(() => loginController.abort());

// 当前登录失败原因。
const error = ref('');

// 邮箱校验错误显示在邮箱标题位置。
const emailError = ref('');

// 密码校验错误显示在密码标题位置。
const passwordError = ref('');

// 修改输入时清除上一轮字段与服务反馈。
const handleInput = () => {
  emailError.value = '';
  passwordError.value = '';
  error.value = '';
};

// 通过 Better Auth 建立 Cookie 会话，并按角色进入对应应用。
const handleSubmit = async () => {
  if (pending.value) {
    return;
  }

  const result = z
    .object({
      email: emailSchema,
      password: z.string().min(1, '请输入密码'),
    })
    .safeParse({ email: email.value, password: password.value });

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    emailError.value = errors.email?.[0] ?? '';
    passwordError.value = errors.password?.[0] ?? '';
    return;
  }

  handleInput();
  pending.value = true;

  try {
    // 网络和临时服务故障持续重试，凭据错误交由表单提示。
    const response = await retryRequest(
      async () => {
        const value = await props.client.signIn.email({
          email: result.data.email,
          password: result.data.password,
          fetchOptions: { signal: loginController.signal, retry: 0 },
        });

        if (
          value.error &&
          ([0, 408].includes(value.error.status) || value.error.status >= 500)
        ) {
          throw value.error;
        }

        return value;
      },
      loginController.signal,
      Number.POSITIVE_INFINITY,
    );

    if (response.error) {
      if (response.error.code === 'BANNED_USER') {
        error.value = '账号已停用，请联系管理员';
        return;
      }

      error.value =
        response.error.code === 'INVALID_EMAIL_OR_PASSWORD'
          ? '邮箱或密码不正确，请重新输入'
          : response.error.message || '登录失败，请稍后重试';

      return;
    }

    password.value = '';

    await session.value.refetch();

    if (response.data.user.role !== props.role) {
      if (props.role === 'user' && response.data.user.role === 'admin') {
        error.value = '当前账号无法用于此客户端登录。';

        await router.replace(
          getLoginRedirect(router, route.query.redirect, props.homeRoute),
        );

        return;
      }

      error.value =
        props.role === 'admin'
          ? '该账号为普通用户，请使用管理员账号登录。'
          : '当前账号无权登录此客户端。';

      return;
    }

    await router.replace(
      getLoginRedirect(router, route.query.redirect, props.homeRoute),
    );
  } catch {
    if (!loginController.signal.aborted) {
      error.value = '无法连接账号服务，请稍后重试';
    }
  } finally {
    pending.value = false;
  }
};
</script>
