<template>
  <div class="player-window wh-screen grid bg-bg">
    <TitleBar />

    <div class="flex">
      <VideoContent />

      <EpisodeList />
    </div>
  </div>
</template>

<script setup lang="ts">
import EpisodeList from "@player/layout/episode-list/index.vue";
import TitleBar from "@player/layout/title-bar/index.vue";
import VideoContent from "@player/layout/video-content/index.vue";
import { useHistoryStore } from "@player/stores/useHistoryStore";
import { useEventListener } from "@vueuse/core";

const { saveHistory } = useHistoryStore();

useEventListener("beforeunload", saveHistory);
</script>

<style scoped lang="scss">
.player-window {
  grid-template-rows: 44px calc(100vh - 44px);
  grid-template-columns: 100vw;

  grid-template-areas:
    "title-bar"
    "content";
}
</style>
