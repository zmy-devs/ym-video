<template>
  <img
    :src="failed || !src ? placeholder : src"
    alt=""
    loading="lazy"
    referrerpolicy="no-referrer"
    class="size-5 shrink-0 rounded-full object-cover"
    @error="failed = true"
  />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import placeholder from '@/assets/default.avif';

// 最近观看对应的海报地址。
const props = defineProps<{ src: string }>();

// 加载失败时显示本地占位图片。
const failed = ref(false);

watch(
  () => props.src,
  () => {
    failed.value = false;
  },
);
</script>
