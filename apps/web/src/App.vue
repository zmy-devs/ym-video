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
import AppLayout from '@/layout/index.vue';
import AppDialogs from '@/components/dialogs/index.vue';
import { useThemeStore } from '@/stores/theme-store';

// 全局提示跟随当前主题。
const theme = useThemeStore();
</script>
