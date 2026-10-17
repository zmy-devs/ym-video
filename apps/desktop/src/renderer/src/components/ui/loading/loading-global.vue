<template>
  <div
    class="flex-center fixed inset-0"
    style="background-color: rgba(0, 0, 0, 0.5); z-index: 9999"
    v-if="visible"
  >
    <Loading />
  </div>
</template>

<script setup lang="ts">
import { visible } from "./loading";
import Loading from "./index.vue";
</script>

<style scoped lang="scss"></style>
