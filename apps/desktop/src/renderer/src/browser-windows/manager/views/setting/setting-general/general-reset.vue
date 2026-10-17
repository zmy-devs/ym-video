<template>
  <Item label="重置" sub="重置软件所有配置" icon="reset">
    <Button @click="handleClick">重置</Button>
  </Item>
</template>

<script setup lang="ts">
import Item from "../setting-item.vue";
import { useConfigStore } from "@manager/stores/useConfigStore";
import Button from "@/components/ui/button.vue";
import MessageBox from "@/components/ui/message-box";
import { useHistoryStore } from "@manager/stores/useHistoryStore";

const { resetConfig } = useConfigStore();
const { resetHistory } = useHistoryStore();

const handleClick = async () => {
  const res = await MessageBox.confirm({
    label: "是否要重置?",
    content: "此操作将会删除全部历史记录和配置",
  });

  if (!res) return;

  resetHistory();
  resetConfig();
};
</script>

<style scoped lang="scss"></style>
