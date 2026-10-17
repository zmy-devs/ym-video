<template>
  <Icon :icon="iconPacks[icon]" :width="size" :height="size" :color="color" />
</template>

<script setup lang="ts">
import { iconPacks, IconName } from "./icon";
import { Icon } from "@iconify/vue";

withDefaults(
  defineProps<{
    size: number | string;
    icon: IconName;
    color?: string;
  }>(),
  {
    color: "rgba(255,255,255,0.8)",
  }
);
</script>

<style scoped lang="scss"></style>
