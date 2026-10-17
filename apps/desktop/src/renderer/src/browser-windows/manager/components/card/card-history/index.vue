<template>
  <section class="history-card flex-center relative cursor-pointer">
    <Card
      :data="data"
      :sub="historyLabel"
      :progress="progress"
      @click="handleClick"
      @contextmenu="handleContextMenu"
    />

    <Hover
      :data="data"
      :sub="historyLabel"
      @click="handleClick"
      @contextmenu="handleContextMenu"
    />
  </section>
</template>

<script setup lang="ts">
import Card from "../base.vue";
import { HistoryInfo } from "@type";
import eventEmitter from "@/hooks/eventEmitter";
import Hover from "./history-hover.vue";

const { data } = defineProps<{
  data: HistoryInfo;
}>();

//播放百分比
const progress = computed(() => {
  if (!data.progress[data.history]) {
    return 0;
  }

  return (
    Math.floor(
      (data.progress[data.history].currentTime /
        data.progress[data.history].duration) *
        100
    ) || 0
  );
});

//当前观看的label
const historyLabel = computed(() => {
  const progressLabel = progress.value ? `观看至${progress.value}%` : "未观看";

  return `${data.episodes[data.history].label} · ${progressLabel}`;
});

//点击
const handleClick = () => {
  ipcRenderer.invoke("openPlayer", toRaw(data));
};

//右键
const handleContextMenu = (e: MouseEvent) => {
  eventEmitter.emit("history:menu:show", e, toRaw(data));
};
</script>

<style scoped lang="scss">
.history-card {
  transition: transform 0.1s;

  &:hover {
    .card-hover {
      transform: scale(1);
    }
  }
}
</style>
