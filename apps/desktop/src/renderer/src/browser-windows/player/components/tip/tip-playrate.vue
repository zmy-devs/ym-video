<template>
  <section class="px-4 py-2 absolute top-4 rounded-xl" v-if="rateTip">
    <span className="text-main text-sm">倍速播放中...</span>
  </section>
</template>

<script setup lang="ts">
import { useVideoStore } from "@player/stores/useVideoStore";

const { rateTip } = storeToRefs(useVideoStore());
</script>

<style scoped lang="scss">
section {
  background-color: rgba(25, 25, 25, 0.5);
}
</style>
