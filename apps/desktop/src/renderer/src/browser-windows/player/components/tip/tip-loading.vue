<template>
  <Loading class="tip-loading" size="40" color="#fff" v-if="isLoading" />
</template>

<script setup lang="ts">
import Loading from "@/components/ui/loading/index.vue";
import { useVideoStore } from "@player/stores/useVideoStore";

const { isLoading } = storeToRefs(useVideoStore());
</script>

<style scoped lang="scss">
.tip-loading {
  filter: drop-shadow(0 0 2px rgba(#000, 0.3));
}
</style>
