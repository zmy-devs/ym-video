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
import AccountLogin from '@ym-video/account/login.vue';
import { Button } from '@ym-video/ui/components/button';
import { infoToast } from '@ym-video/ui/lib/toast';
import { authClient } from '@/services/auth';
import icon from '../../../../assets/icon.png';

// 自助注册保持邀请制。
const handleInvitationRegistration = () => infoToast('仅支持邀请注册');
</script>
