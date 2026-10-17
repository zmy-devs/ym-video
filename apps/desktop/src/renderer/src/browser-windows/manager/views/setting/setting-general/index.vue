<template>
  <Group label="通用">
    <AutoUpdate />

    <Repo />

    <Reset />
  </Group>
</template>

<script setup lang="ts">
import Reset from "./general-reset.vue";
import Group from "../setting-group.vue";
import AutoUpdate from "./general-autoUpdate.vue";
import Repo from "./general-repo.vue";
</script>

<style scoped lang="scss"></style>
