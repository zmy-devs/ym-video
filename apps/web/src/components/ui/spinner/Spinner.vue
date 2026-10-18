<template>
  <LoaderCircle
    data-slot="spinner"
    role="status"
    aria-label="加载中"
    :class="cn('size-4 animate-spin', props.class)"
  />
</template>

<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { LoaderCircle } from 'lucide-vue-next';
import { cn } from '@/lib/utils';

// 与 shadcn-vue Spinner 保持一致的尺寸、动画与状态语义。
const props = defineProps<{ class?: HTMLAttributes['class'] }>();
</script>
