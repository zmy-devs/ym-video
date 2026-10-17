<template>
  <ElScrollbar view-class="px-2 pb-2 grid grid-cols-2 gap-1.5">
    <Item
      v-for="item in episodeData"
      :key="item.value"
      :data="item"
      :active="item.value == history.history"
      @click="setHistory(item.value)"
    />
  </ElScrollbar>
</template>

<script setup lang="ts">
import { ElScrollbar } from "element-plus";
import Item from "./content-item.vue";
import { useHistoryStore } from "@player/stores/useHistoryStore";
import { useEpisodeStore } from "@player/stores/useEpisodeStore";

const { currentPage } = storeToRefs(useEpisodeStore());
const { MAX } = useEpisodeStore();
const { history } = storeToRefs(useHistoryStore());
const { setHistory } = useHistoryStore();

const episodeData = computed(() => {
  return history.value.episodes.slice(
    currentPage.value * MAX,
    (currentPage.value + 1) * MAX
  );
});
</script>

<style scoped lang="scss"></style>
