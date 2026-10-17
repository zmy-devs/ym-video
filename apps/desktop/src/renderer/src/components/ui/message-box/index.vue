<template>
  <ElDialog
    :width="350"
    :title="data.label"
    align-center
    v-model="data.visible"
    @closed="data.onCancel"
  >
    <span class="text-base">{{ data.content }}</span>

    <template #footer>
      <div class="flex gap-2">
        <Buttom class="flex-1" type="primary" @click="handleConfirm">
          {{ data.confirmButtonText || "确定" }}
        </Buttom>

        <Buttom class="flex-1" @click="handleCancel">
          {{ data.cancelButtonText || "取消" }}
        </Buttom>
      </div>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
import { ElDialog } from "element-plus";
import Buttom from "@/components/ui/button.vue";
import { data } from "./message-box";

//处理确定
const handleConfirm = () => {
  data.onConfirm();
  data.visible = false;
};

//处理取消
const handleCancel = () => {
  data.visible = false;
};
</script>

<style scoped lang="scss"></style>
