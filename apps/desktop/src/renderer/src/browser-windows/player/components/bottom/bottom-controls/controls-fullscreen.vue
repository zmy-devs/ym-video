<template>
  <Tooltip
    :label="isFullscreen ? '退出全屏' : '全屏'"
    :append-to="playerRef"
    placement="top"
  >
    <Buttom @click="setFullscreen()">
      <Icon :icon="isFullscreen ? 'fullscreenOff' : 'fullscreenOn'" size="24" />
    </Buttom>
  </Tooltip>
</template>

<script setup lang="ts">
import Tooltip from "@/components/ui/tooltip.vue";
import Icon from "@/components/ui/icon/index.vue";
import Buttom from "./controls-button.vue";
import { playerRef } from "@player/stores/useEl";
import { useVideoStore } from "@player/stores/useVideoStore";

const { isFullscreen } = storeToRefs(useVideoStore());
const { setFullscreen } = useVideoStore();
</script>

<style scoped lang="scss"></style>
