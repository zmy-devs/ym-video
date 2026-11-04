<template>
  <header
    v-if="isDesktop"
    class="login-title-bar desktop-title-bar-standalone fixed inset-x-0 top-0 z-60 h-(--title-bar-height)"
  />
</template>

<script setup lang="ts">
import { isTauri } from '@/lib/desktop';

// 登录页只预留无装饰的窗口拖动区域。
const isDesktop = isTauri();
</script>
