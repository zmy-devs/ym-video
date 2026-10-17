<template>
  <Tooltip label="画中画" :append-to="playerRef" placement="top">
    <Buttom @click="handleClick">
      <Icon icon="pip" size="24" />
    </Buttom>
  </Tooltip>
</template>

<script setup lang="ts">
import Tooltip from "@/components/ui/tooltip.vue";
import Icon from "@/components/ui/icon/index.vue";
import Buttom from "./controls-button.vue";
import { videoRef } from "@player/stores/useEl";
import { playerRef } from "@player/stores/useEl";

//进入画中画
const handleClick = () => {
  if (!videoRef.value) {
    return;
  }

  videoRef.value.requestPictureInPicture();
};
</script>

<style scoped lang="scss"></style>
