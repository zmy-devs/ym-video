<template>
  <Group label="播放源">
    <Item label="播放源" icon="source" sub="选择你需要的播放源">
      <Select v-model="config.selectedSource" value-key="label">
        <ElOption
          v-for="item in config.sources"
          :key="item.label"
          :label="item.label"
          :value="item"
        />
      </Select>

      <Button type="primary" @click="handleClick">管理</Button>
    </Item>
  </Group>

  <Manage v-model="manageVisible" />
</template>

<script setup lang="ts">
import Manage from "./source-manage/index.vue";
import Group from "../setting-group.vue";
import Item from "../setting-item.vue";
import { useConfigStore } from "@manager/stores/useConfigStore";
import { ElOption } from "element-plus";
import Button from "@/components/ui/button.vue";
import Select from "@/components/ui/select.vue";

const { config } = storeToRefs(useConfigStore());

const manageVisible = ref(false);

const handleClick = () => {
  manageVisible.value = true;
};
</script>

<style scoped lang="scss"></style>
