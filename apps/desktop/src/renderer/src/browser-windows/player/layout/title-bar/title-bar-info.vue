<template>
  <section class="flex items-center gap-2">
    <Image
      class="size-5 rounded-full overflow-hidden aspect-square"
      :src="history.pic"
    />

    <span class="text-sm text-main">{{ history.name }}</span>
  </section>
</template>

<script setup lang="ts">
import Image from "@/components/image.vue";
import { useHistoryStore } from "@player/stores/useHistoryStore";

const { history } = storeToRefs(useHistoryStore());
</script>

<style scoped lang="scss"></style>
