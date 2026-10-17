<template>
  <section
    class="h-8 px-2 flex items-center shrink-0 rounded-md transition-colors"
  >
    <span class="text-sub text-xs">{{ label }}</span>
  </section>
</template>

<script setup lang="ts">
const { label } = defineProps<{
  label: string;
}>();
</script>

<style scoped lang="scss"></style>
