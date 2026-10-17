<template>
  <Content label="设置">
    <main class="py-6">
      <SettingSource />

      <SettingGeneral />

      <SettingAbout />
    </main>
  </Content>
</template>

<script setup lang="ts">
import Content from "@manager/components/content/index.vue";
import SettingSource from "./setting-source/index.vue";
import SettingGeneral from "./setting-general/index.vue";
import SettingAbout from "./setting-about/index.vue";
</script>

<style scoped lang="scss"></style>
