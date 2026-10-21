<template>
  <div class="relative overflow-hidden bg-muted">
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
      :aria-hidden="!loaded"
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
import { ref, watch } from 'vue';
import placeholder from '@/assets/default.avif';

// 卡片与悬浮预览共用海报加载和占位行为。
const props = defineProps<{ src: string; alt: string }>();

// 图片完成加载前显示本地默认海报，避免显示破图或空白。
const loaded = ref(false);

// 图片失败后保留默认海报，等待地址变化后再尝试加载。
const failed = ref(false);

watch(
  () => props.src,
  () => {
    loaded.value = false;
    failed.value = false;
  },
);
</script>
