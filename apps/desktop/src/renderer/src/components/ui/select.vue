<template>
  <ElSelect class="select" v-model="model" :value-key="valueKey">
    <slot></slot>
  </ElSelect>
</template>

<script setup lang="ts">
import { ElSelect } from "element-plus";

withDefaults(
  defineProps<{
    width?: number;
    valueKey?: string;
  }>(),
  {
    width: 120,
  }
);

const model = defineModel<number | string | boolean | object>({
  required: true,
});
</script>

<style scoped lang="scss">
.select {
  width: calc(v-bind("width") * 1px);

  &:deep(.el-select__wrapper) {
    background-color: #303030 !important;
    box-shadow: 0px 0px 0px 1px rgba(0, 0, 0, 0.1),
      0 0.5px 0 0 rgba(255, 255, 255, 0.1) inset;

    transition: background-color 0.1s;

    &:hover {
      background-color: #383838 !important;
    }
  }
}
</style>
