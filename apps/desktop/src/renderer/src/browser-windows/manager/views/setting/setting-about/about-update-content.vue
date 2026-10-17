<template>
  <Item label="更新内容" icon="update" sub="查看应用更新的内容">
    <Button @click="handleClick">查看</Button>
  </Item>
</template>

<script setup lang="ts">
import Button from "@/components/ui/button.vue";
import { useConfigStore } from "@manager/stores/useConfigStore";
import Item from "@manager/views/setting/setting-item.vue";

const { config } = storeToRefs(useConfigStore());

const handleClick = () => {
  api.openUrl(`${config.value.selectedRepo.url}/blob/main/release-note.md`);
};
</script>

<style scoped lang="scss"></style>
