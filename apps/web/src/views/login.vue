<template>
  <AccountLogin
    :client="authClient"
    role="user"
    home-route="overview"
    :icon="icon"
  >
    <template #footer>
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
    </template>
  </AccountLogin>
</template>

<script setup lang="ts">
import AccountLogin from '@ym-video/ui/account/login.vue';
import { Button } from '@ym-video/ui/components/button';
import { useRouter } from 'vue-router';
import { authClient } from '@/services/auth';
import icon from '../../../../assets/icon.png';

const router = useRouter();

// 注册入口改为客户端内的邀请码表单。
const handleInvitationRegistration = () => router.push('/register');
</script>
