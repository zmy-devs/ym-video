<template>
  <Item label="远程数据源" icon="globe" sub="远程更新数据源">
    <Select
      style="width: 120px"
      v-model="config.selectedRepo"
      value-key="label"
    >
      <ElOption
        v-for="item in repos"
        :key="item.label"
        :label="item.label"
        :value="item"
      />
    </Select>
  </Item>
</template>

<script setup lang="ts">
import Select from "@/components/ui/select.vue";
import Item from "@manager/views/setting/setting-item.vue";
import { ElOption } from "element-plus";
import { useConfigStore } from "@manager/stores/useConfigStore";
import { appName } from "@/services/info";

const { config } = storeToRefs(useConfigStore());

const repos = [
  {
    label: "Gitee",
    url: `https://gitee.com/yxingyus/${appName}`,
    updateUrl: `https://gitee.com/api/v5/repos/yxingyus/${appName}/releases/latest`,
  },
  {
    label: "GitHub",
    url: `https://github.com/2514765066/${appName}`,
    updateUrl: `https://api.github.com/repos/2514765066/${appName}/releases/latest`,
  },
];
</script>

<style scoped lang="scss"></style>
