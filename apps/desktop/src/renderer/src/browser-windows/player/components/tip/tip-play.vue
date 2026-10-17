<template>
  <Icon
    class="tip-play absolute"
    icon="playFill"
    size="80"
    color="#fff"
    v-if="!isPlay"
  />
</template>

<script setup lang="ts">
import Icon from "@/components/ui/icon/index.vue";
import { useVideoStore } from "@player/stores/useVideoStore";

const { isPlay } = storeToRefs(useVideoStore());
</script>

<style scoped lang="scss">
.tip-play {
  filter: drop-shadow(0 0 2px rgba(#000, 0.3));
}
</style>
