<template>
  <section class="title-bar pl-2 flex items-center gap-2">
    <TitleBarNav />
  </section>
</template>

<script setup lang="ts">
import TitleBarNav from "./title-bar-nav.vue";
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
