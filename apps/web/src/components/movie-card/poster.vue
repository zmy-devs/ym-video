<template>
  <div :class="cn('relative overflow-hidden bg-muted', props.class)">
    <img
      v-if="!loaded || failed || !src"
      :src="placeholder"
      :alt="alt"
      class="absolute inset-0 size-full object-cover"
    />
    <img
      v-if="src && !failed"
      :key="src"
      :src="src"
      :alt="alt"
      loading="lazy"
      referrerpolicy="no-referrer"
      class="size-full object-cover"
      :class="{ 'opacity-0': !loaded }"
      @load="loaded = true"
      @error="failed = true"
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
  alt: string;
  class?: HTMLAttributes['class'];
}>();

const loaded = ref(false);
const failed = ref(false);
watch(
  () => props.src,
  () => {
    loaded.value = false;
    failed.value = false;
  },
);
</script>
