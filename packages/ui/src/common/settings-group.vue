<template>
  <section class="min-w-0" :class="mobile && 'grid gap-2'">
    <h2
      :id="headingId"
      :class="
        mobile
          ? 'px-4 text-sm font-medium text-muted-foreground'
          : 'border-b px-4 py-3 text-sm'
      "
    >
      {{ title }}
    </h2>
    <component
      :is="mobile ? ButtonGroup : 'div'"
      :orientation="mobile ? 'vertical' : undefined"
      :aria-labelledby="mobile ? headingId : undefined"
      :class="mobile && 'w-full min-w-0'"
    >
      <slot />
    </component>
  </section>
</template>

<script setup lang="ts">
import { useId } from 'vue';
import { ButtonGroup } from '@ym-video/ui/components/button-group';

// 设置分组在移动端使用竖向按钮组，桌面端沿用标题分区。
defineProps<{ title: string; mobile?: boolean }>();

// 每个分组通过可见标题提供可访问名称。
const headingId = useId();
</script>
