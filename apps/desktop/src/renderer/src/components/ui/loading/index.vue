<template>
  <section class="wh-full flex-center">
    <Icon icon="loading" class="rotate" :size="size" :color="color" />
  </section>
</template>

<script setup lang="ts">
import Icon from "@/components/ui/icon/index.vue";

withDefaults(
  defineProps<{
    size?: number | string;
    color?: string;
  }>(),
  {
    size: 32,
    color: "rgba(255,255,255,0.6)",
  }
);
</script>

<style scoped lang="scss"></style>
