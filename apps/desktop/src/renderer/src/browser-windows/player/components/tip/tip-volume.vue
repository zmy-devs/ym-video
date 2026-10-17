<template>
  <TipBase :icon="iconName" :data="volume" v-if="visible" />
</template>

<script setup lang="ts">
import eventEmitter from "@/hooks/eventEmitter";
import TipBase from "./tip-base.vue";
import useVisible from "@/hooks/useVisible";
import { useVideoStore } from "@player/stores/useVideoStore";

const { volume } = storeToRefs(useVideoStore());

const { visible, show } = useVisible(1000);

const iconName = computed(() => {
  if (volume.value == 0) {
    return "volumeOff";
  }

  if (volume.value > 0 && volume.value < 50) {
    return "volume1";
  }

  return "volume2";
});

eventEmitter.on("player:volume:show", show);
</script>

<style scoped lang="scss"></style>
