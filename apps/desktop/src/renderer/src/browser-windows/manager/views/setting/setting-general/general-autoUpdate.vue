<template>
  <Item label="自动更新" sub="关闭后无法自动获取更新" icon="update">
    <Switch v-model="config.autoUpdate" />
  </Item>
</template>

<script setup lang="ts">
import Switch from "@/components/ui/switch.vue";
import Item from "../setting-item.vue";
import { useConfigStore } from "@manager/stores/useConfigStore";

const { config } = storeToRefs(useConfigStore());
</script>

<style scoped lang="scss"></style>
