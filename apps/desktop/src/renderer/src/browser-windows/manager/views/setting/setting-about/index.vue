<template>
  <Group label="关于">
    <Update />

    <UpdateContent />

    <Bug />

    <Version />
  </Group>
</template>

<script setup lang="ts">
import Group from "../setting-group.vue";
import Update from "./about-update.vue";
import UpdateContent from "./about-update-content.vue";
import Version from "./about-version.vue";
import Bug from "./about-bug.vue";
</script>

<style scoped lang="scss"></style>
