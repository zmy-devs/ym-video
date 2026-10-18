<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-sm" @close-auto-focus="handleCloseAutoFocus">
      <DialogHeader>
        <DialogTitle>{{
          registering ? '创建账号' : '登录 ym-video'
        }}</DialogTitle>
        <DialogDescription
          >登录后可使用账号；观看历史暂时仅保存在本浏览器。</DialogDescription
        >
      </DialogHeader>
      <form class="grid gap-4" @submit.prevent="handleSubmit">
        <div v-if="registering" class="grid gap-2">
          <Label for="account-name">昵称</Label>
          <Input
            id="account-name"
            v-model="name"
            autocomplete="nickname"
            required
            maxlength="80"
          />
        </div>
        <div class="grid gap-2">
          <Label for="account-email">邮箱</Label>
          <Input
            id="account-email"
            v-model="email"
            type="email"
            autocomplete="email"
            required
          />
        </div>
        <div class="grid gap-2">
          <Label for="account-password">密码</Label>
          <Input
            id="account-password"
            v-model="password"
            type="password"
            :autocomplete="registering ? 'new-password' : 'current-password'"
            minlength="8"
            maxlength="128"
            required
          />
          <p v-if="registering" class="text-xs text-muted-foreground">
            使用 8–128 位密码
          </p>
        </div>
        <p v-if="error" role="alert" class="text-sm text-destructive">
          {{ error }}
        </p>
        <Button type="submit" :disabled="pending"
          ><LoaderCircle v-if="pending" class="size-4 animate-spin" />{{
            registering ? '注册并登录' : '登录'
          }}</Button
        >
        <Button
          type="button"
          variant="link"
          :disabled="pending"
          @click="handleToggle"
          >{{ registering ? '已有账号？去登录' : '还没有账号？去注册' }}</Button
        >
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { LoaderCircle } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { authClient } from '@/services/auth';

// 表单密码仅存在当前弹窗内存中，关闭即清除。
const open = defineModel<boolean>('open', { required: true });

// 当前显示注册或登录表单。
const registering = ref(false);

// 注册时使用的昵称。
const name = ref('');

// 用户输入的邮箱。
const email = ref('');

// 当前表单中的临时密码。
const password = ref('');

// 当前操作失败时的提示。
const error = ref('');

// 阻止重复提交的请求状态。
const pending = ref(false);

// 关闭弹窗后将键盘焦点交还账号菜单。
const handleCloseAutoFocus = (event: Event) => {
  event.preventDefault();
  document.getElementById('account-menu-trigger')?.focus();
};

// 切换登录模式时清除旧错误。
const handleToggle = () => {
  registering.value = !registering.value;
  error.value = '';
};

// 根据当前表单调用对应的邮箱认证接口。
const submitAccount = () => {
  if (registering.value) {
    return authClient.signUp.email({
      name: name.value.trim(),
      email: email.value.trim(),
      password: password.value,
    });
  }
  return authClient.signIn.email({
    email: email.value.trim(),
    password: password.value,
  });
};

// 通过 Better Auth 建立 HttpOnly Cookie 会话。
const handleSubmit = async () => {
  if (pending.value) {
    return;
  }
  pending.value = true;
  error.value = '';
  try {
    // 本次异步操作返回结果。
    const result = await submitAccount();
    if (result.error) {
      error.value =
        result.error.code === 'INVALID_EMAIL_OR_PASSWORD'
          ? '邮箱或密码不正确'
          : result.error.message || '操作失败，请重试';
      return;
    }
    open.value = false;
    toast.success('登录成功');
  } catch {
    error.value = '无法连接账号服务，请稍后重试';
  } finally {
    pending.value = false;
  }
};
watch(open, (value) => {
  if (!value) {
    password.value = '';
    error.value = '';
  }
});
</script>
