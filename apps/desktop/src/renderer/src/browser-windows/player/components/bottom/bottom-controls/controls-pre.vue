<template>
  <Tooltip label="上一集" :append-to="playerRef" placement="top" v-if="visible">
    <Buttom @click="preEpisode">
      <Icon icon="next" size="22" class="rotate-180" />
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

//是否有上一集
const visible = computed(() => {
  return history.value.history != 0;
});

//上一集
const preEpisode = () => {
  setHistory(history => history - 1);
};
</script>

<style scoped lang="scss"></style>
