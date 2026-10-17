<template>
  <section class="movie-card flex-center relative cursor-pointer">
    <Card :data="data" @click="handleClick" />

    <Hover :data="data" @click="handleClick" />
  </section>
</template>

<script setup lang="ts">
import { useHistoryStore } from "@manager/stores/useHistoryStore";
import Card from "../base.vue";
import { MovieInfo } from "@type";
import Hover from "./movie-hover.vue";

const { addHistory } = useHistoryStore();

const props = defineProps<{
  data: MovieInfo;
}>();

const handleClick = () => {
  const value = addHistory(props.data);

  ipcRenderer.invoke("openPlayer", toRaw(value));
};
</script>

<style scoped lang="scss">
.movie-card {
  &:hover {
    .card-hover {
      transform: scale(1);
    }
  }
}
</style>
