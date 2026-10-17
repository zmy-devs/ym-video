<template>
  <section
    class="w-full absolute bottom-0 left-0 z-30"
    @mouseenter="showControl"
    @mouseleave="hideControl"
    @mousemove.stop
  >
    <div
      class="px-4 flex flex-col gap-3"
      v-if="!isFullscreen || controlVisible"
    >
      <Controls v-show="!seekVisible" />

      <Progress />
    </div>

    <div class="progress h-0.5 bg-main rounded-full" v-else></div>
  </section>
</template>

<script setup lang="ts">
import Controls from "./bottom-controls/index.vue";
import Progress from "./bottom-progress/index.vue";
import {
  seekVisible,
  currentTimePrecent,
} from "@player/stores/useProgressStore";
import { useControlStore } from "@player/stores/useControlStore";
import { useVideoStore } from "@player/stores/useVideoStore";

const { isFullscreen } = storeToRefs(useVideoStore());
const { controlVisible } = storeToRefs(useControlStore());
const { showControl, hideControl } = useControlStore();
</script>

<style scoped lang="scss">
.progress {
  width: calc(v-bind("currentTimePrecent") * 1%);
}
</style>
