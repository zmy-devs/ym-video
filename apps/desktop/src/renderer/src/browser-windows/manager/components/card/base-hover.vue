<template>
  <main
    class="card-hover flex flex-col absolute z-10 rounded-xl overflow-hidden"
  >
    <Image class="w-full h-56" :src="data.pic" />

    <section class="px-4 py-2 flex flex-col justify-center gap-2 bg-list">
      <span class="text-main text-lg">{{ data.name }}</span>

      <slot></slot>
    </section>
  </main>
</template>

<script setup lang="ts">
import Image from "@/components/image.vue";
import { MovieInfo } from "@type";

defineProps<{
  data: MovieInfo;
}>();
</script>

<style scoped lang="scss">
.card-hover {
  width: 280px;

  box-shadow: rgba(0, 0, 0, 0.2) 0px 14px 28px -6px,
    rgba(0, 0, 0, 0.12) 0px 2px 4px -1px;

  transform: scale(0);

  transition: transform 0.15s;

  > section {
    box-shadow: 0 0 8px 8px var(--list-color);
  }
}
</style>
