<template>
  <Tooltip label="下一集" :append-to="playerRef" placement="top" v-if="visible">
    <Buttom @click="nextEpisode">
      <Icon icon="next" size="22" />
    </Buttom>
  </Tooltip>
</template>

<script setup lang="ts">
import Tooltip from "@/components/ui/tooltip.vue";
import Icon from "@/components/ui/icon/index.vue";
import Buttom from "./controls-button.vue";
import { useHistoryStore } from "@player/stores/useHistoryStore";
import { playerRef } from "@player/stores/useEl";

const { history } = storeToRefs(useHistoryStore());
const { setHistory } = useHistoryStore();

//是否有下一集
const visible = computed(() => {
  return history.value.history != history.value.episodes.length - 1;
});

//下一集
const nextEpisode = () => {
  setHistory(history => history + 1);
};
</script>

<style scoped lang="scss"></style>
