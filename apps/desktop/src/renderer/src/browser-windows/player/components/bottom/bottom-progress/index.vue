<template>
  <section class="pb-2 flex flex-col gap-1">
    <ProgressBar />

    <div class="flex justify-between">
      <span class="text-main text-shadow">
        {{ formatSeconde(currentTime) }}
      </span>

      <span class="text-main text-shadow">
        {{ formatSeconde(duration) }}
      </span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { formatSeconde } from "@/utils/format";
import ProgressBar from "./progress-bar.vue";
import { currentTime, duration } from "@player/stores/useProgressStore";
</script>

<style scoped lang="scss"></style>
