<template>
  <section class="w-full flex justify-between items-center">
    <ControlsLabel />

    <div class="flex gap-4">
      <ControlsPre />

      <ControlsNext />

      <ControlsRate />

      <ControlsPip />

      <ControlsFullscreen />
    </div>
  </section>
</template>

<script setup lang="ts">
import ControlsLabel from "./controls-label.vue";
import ControlsPre from "./controls-pre.vue";
import ControlsNext from "./controls-next.vue";
import ControlsPip from "./controls-pip.vue";
import ControlsFullscreen from "./controls-fullscreen.vue";
import ControlsRate from "./controls-rate.vue";
</script>

<style scoped lang="scss"></style>
