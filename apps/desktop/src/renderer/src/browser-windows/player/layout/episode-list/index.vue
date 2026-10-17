<template>
  <section
    class="episode-list py-2 flex flex-col shrink-0 gap-2 border-l border-border"
    v-if="history.episodes.length > 1"
  >
    <Page />

    <Content />
  </section>
</template>

<script setup lang="ts">
import Page from "./episode-list-page.vue";
import Content from "./episode-list-content/index.vue";
import { useHistoryStore } from "@player/stores/useHistoryStore";

const { history } = storeToRefs(useHistoryStore());
</script>

<style scoped lang="scss">
.episode-list {
  width: 260px;
  grid-area: epsiode-list;
}
</style>
