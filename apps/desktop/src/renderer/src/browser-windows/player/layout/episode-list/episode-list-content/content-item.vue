<template>
  <button
    class="h-10 px-4 flex-center rounded-md hover:bg-primary transition-colors"
    :class="`${active ? 'bg-primary' : 'bg-hover'}`"
    :title="data.label"
  >
    <span class="text-main text-sm ellipsis">{{ data.label }}</span>
  </button>
</template>

<script setup lang="ts">
import { Episode } from "@type";

defineProps<{
  data: Episode;
  active?: boolean;
}>();
</script>

<style scoped lang="scss"></style>
