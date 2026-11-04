<template>
  <TooltipProvider>
    <AppLayout />
    <AppDialogs />
    <Toaster :theme="theme.resolved" position="top-center" />
  </TooltipProvider>
</template>

<script setup lang="ts">
import { TooltipProvider } from '@ym-video/ui/components/tooltip';
import { Toaster } from '@ym-video/ui/components/sonner';
import AppDialogs from '@/components/dialogs/index.vue';
import { useThemeStore } from '@/stores/theme-store';
import AppLayout from '@/layout/index.vue';

// 根层只编排当前路由与全局弹层。
const theme = useThemeStore();
</script>
