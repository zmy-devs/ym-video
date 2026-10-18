<template>
  <div class="relative overflow-hidden bg-muted">
    <div
      v-if="!loaded || failed || !src"
      class="absolute inset-0 flex items-center justify-center text-muted-foreground"
      role="img"
      :aria-label="alt"
    >
      <ImageIcon class="size-10" aria-hidden="true" />
    </div>
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
import { Image as ImageIcon } from 'lucide-vue-next';

// 卡片与悬浮预览共用海报加载和占位行为。
const props = defineProps<{ src: string; alt: string }>();

// 图片完成加载前保持图标占位，避免显示破图或空白。
const loaded = ref(false);

// 图片失败后保留占位，不再请求额外的替代图片。
const failed = ref(false);

watch(
  () => props.src,
  () => {
    loaded.value = false;
    failed.value = false;
  },
);
</script>
