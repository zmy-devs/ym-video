<template>
  <section
    data-slot="card"
    :class="
      cn(
        'rounded-xl border bg-card text-card-foreground shadow-sm',
        props.class,
      )
    "
  >
    <slot />
  </section>
</template>

<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { cn } from '@/lib/utils';

// 可访问的主题卡片容器，保留调用处提供的语义属性。
const props = defineProps<{ class?: HTMLAttributes['class'] }>();
</script>
