<template>
  <section class="mb-6 flex flex-col">
    <span class="py-3 text-sm text-sub">{{ label }}</span>

    <main class="flex-1 flex flex-col">
      <slot></slot>
    </main>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  label?: string;
  icon?: string;
}>();
</script>

<style scoped lang="scss"></style>
