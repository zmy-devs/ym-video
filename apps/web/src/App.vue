<template>
  <TooltipProvider>
    <AppLayout />
    <AppDialogs />
    <Toaster
      :theme="theme.resolved"
      position="top-center"
      :class="isMobile ? '[&_[data-sonner-toast]]:rounded-full!' : undefined"
    />
  </TooltipProvider>
</template>

<script setup lang="ts">
import { TooltipProvider } from '@ym-video/ui/components/tooltip';
import { Toaster } from '@ym-video/ui/components/sonner';
import AppLayout from '@/layout/index.vue';
import AppDialogs from '@/components/dialogs/index.vue';
import { useThemeStore } from '@/stores/theme-store';
import { isMobile } from '@/platform';

// 全局提示跟随当前主题。
const theme = useThemeStore();
</script>
