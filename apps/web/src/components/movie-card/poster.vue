<template>
  <div :class="cn('relative overflow-hidden bg-muted', props.class)">
    <img
      v-if="status !== 'loaded' || !src"
      :src="placeholder"
      alt=""
      class="absolute inset-0 size-full object-cover"
    />
    <img
      v-if="src && status !== 'error'"
      :key="src"
      :src="src"
      alt=""
      loading="lazy"
      referrerpolicy="no-referrer"
      class="size-full object-cover"
      :class="{ 'opacity-0': status !== 'loaded' }"
      @load="status = 'loaded'"
      @error="status = 'error'"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, type HTMLAttributes } from 'vue';
import { cn } from '@ym-video/ui/lib/utils';
const placeholder = new URL('../../assets/default.avif', import.meta.url).href;

// 统一管理影片海报的加载状态和占位图。
const props = defineProps<{
  src: string;
  class?: HTMLAttributes['class'];
}>();

// 加载、成功和失败使用同一份互斥状态。
const status = ref<'loading' | 'loaded' | 'error'>('loading');
watch(
  () => props.src,
  () => {
    status.value = 'loading';
  },
);
</script>
