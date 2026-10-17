<template>
  <section class="flex-center absolute inset-0 z-20 pointer-events-none">
    <TipPlayrate />

    <TipLoading />

    <TipPlay />

    <TipVolume />
  </section>
</template>

<script setup lang="ts">
import TipPlayrate from "./tip-playrate.vue";
import TipLoading from "./tip-loading.vue";
import TipPlay from "./tip-play.vue";
import TipVolume from "./tip-volume.vue";
</script>

<style scoped lang="scss"></style>
