<template>
  <Item label="版本" icon="about" sub="应用的当前版本">
    <span class="text-main text-sm">{{ appVersion }}</span>
  </Item>
</template>

<script setup lang="ts">
import Item from "../setting-item.vue";
import { appVersion } from "@/services/info";
</script>

<style scoped lang="scss"></style>
