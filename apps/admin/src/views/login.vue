<template>
  <AccountLogin
    :client="authClient"
    role="admin"
    home-route="users"
    :icon="icon"
  >
    <template #footer>
      <p class="text-center text-sm text-muted-foreground">
        普通用户请使用 Windows 或 Android 客户端
      </p>
    </template>
  </AccountLogin>
</template>

<script setup lang="ts">
import AccountLogin from '@ym-video/ui/account/login.vue';
import { authClient } from '@/services/auth';
import icon from '../../../../assets/icon.png';
</script>
