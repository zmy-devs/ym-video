<template>
  <section class="title-bar flex items-center pl-3 border-b border-border">
    <Info />
  </section>
</template>

<script setup lang="ts">
import Info from "./title-bar-info.vue";
</script>

<style scoped lang="scss">
.title-bar {
  grid-area: title-bar;
  padding-right: 148px;

  -webkit-app-region: drag;

  * {
    -webkit-app-region: no-drag;
  }
}
</style>
