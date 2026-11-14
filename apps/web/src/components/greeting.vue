<template>
  <h1>
    {{ isMobile ? `Hi，${greeting}` : `${greeting}，亲爱的用户` }}
    <span class="ml-2">😊</span>
  </h1>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useNow } from '@vueuse/core';
import { getGreeting } from '../utils/greeting.ts';
import { isMobile } from '@/platform';

// 两端使用当前本地时间显示问候。
const now = useNow({ interval: 60_000 });
const greeting = computed(() => getGreeting(now.value));
</script>
