<template>
  <AccountLogin
    :client="authClient"
    role="admin"
    home-route="users"
    :icon="icon"
  >
    <template #footer>
      <a
        :href="webOrigin"
        class="text-center text-sm text-muted-foreground hover:text-primary"
      >
        返回 Ym Video
      </a>
    </template>
  </AccountLogin>
</template>

<script setup lang="ts">
import AccountLogin from '@ym-video/account/login.vue';
import { authClient, webOrigin } from '@/services/auth';
import icon from '../../../../assets/icon.png';
</script>
