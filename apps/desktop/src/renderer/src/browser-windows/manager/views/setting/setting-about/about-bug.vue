<template>
  <Item label="反馈问题" icon="bug" sub="反馈应用存在的问题">
    <Button @click="handleClick">反馈</Button>
  </Item>
</template>

<script setup lang="ts">
import Item from "@manager/views/setting/setting-item.vue";
import Button from "@/components/ui/button.vue";
import { useConfigStore } from "@manager/stores/useConfigStore";

const { config } = storeToRefs(useConfigStore());

const handleClick = () => {
  api.openUrl(`${config.value.selectedRepo.url}/issues`);
};
</script>

<style scoped lang="scss"></style>
