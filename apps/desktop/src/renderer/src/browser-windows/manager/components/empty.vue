<template>
  <section class="flex-1 flex-center flex-col gap-4">
    <Icon icon="empty" size="150" color="rgba(255,255,255,0.2)" />

    <span class="text-main-dark2">{{ label }}</span>
  </section>
</template>

<script setup lang="ts">
import Icon from "@/components/ui/icon/index.vue";

withDefaults(
  defineProps<{
    label?: string;
  }>(),
  {
    label: "暂无更多内容...",
  }
);
</script>

<style scoped lang="scss"></style>
