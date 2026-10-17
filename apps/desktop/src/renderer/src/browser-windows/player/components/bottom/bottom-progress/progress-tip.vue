<template>
  <section class="absolute" v-show="seekVisible">
    <div class="w-0.5 h-4 relative bg-main">
      <span
        class="absolute left-1/2 -translate-x-1/2 -translate-y-full text-main text-shadow"
      >
        {{ label }}
      </span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { seekVisible } from "@player/stores/useProgressStore";

defineProps<{
  x: number;
  label: string;
}>();
</script>

<style scoped lang="scss">
section {
  transform: translateX(calc(v-bind("x") * 1px));
}
</style>
