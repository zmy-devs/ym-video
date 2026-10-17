<template>
  <section class="mb-6 flex flex-col">
    <span class="py-2 text-xs text-sub">{{ label }}</span>

    <div class="flex flex-col gap-2">
      <slot></slot>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
}>();
</script>

<style scoped lang="scss"></style>
