<template>
  <ElDialog class="setting-source-manage" title="管理播放源" v-model="model">
    <ElScrollbar max-height="40vh" view-class="px-3 pb-2">
      <main class="flex flex-col gap-1">
        <Item
          v-for="item in config.sources"
          :key="item.label"
          :label="item.label"
          :sub="item.url"
          :disabled="item.label == config.selectedSource.label"
          @remove="handleRemove(item.label)"
          @click="setSource(item)"
        />
      </main>
    </ElScrollbar>

    <template #footer>
      <Footer />
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
import Footer from "./manage-footer.vue";
import Item from "./manage-item.vue";
import { ElDialog, ElScrollbar } from "element-plus";
import { useConfigStore } from "@manager/stores/useConfigStore";
import eventEmitter from "@/hooks/eventEmitter";

const { config } = storeToRefs(useConfigStore());
const { removeSource, setSource } = useConfigStore();

const model = defineModel<boolean>({
  required: true,
});

//处理删除
const handleRemove = (label: string) => {
  removeSource(label);

  eventEmitter.emit("success:show", "删除成功");
};
</script>

<style lang="scss">
.setting-source-manage {
  padding: unset !important;

  .el-dialog__header {
    padding: 16px !important;
  }

  .el-dialog__footer {
    padding: 16px !important;
    border-top: 1px solid var(--border-color);
  }
}
</style>
