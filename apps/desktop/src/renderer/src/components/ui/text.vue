<template>
  <ElInput class="text" :placeholder="placeholder" v-model="model"></ElInput>
</template>

<script setup lang="ts">
import { ElInput } from "element-plus";

defineProps<{
  placeholder?: string;
}>();

const model = defineModel<string>();
</script>

<style scoped lang="scss">
.text {
  border-radius: 6px !important;

  background-color: #292929 !important;

  &:deep(.el-input__wrapper) {
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1),
      0 0.5px 0 0 rgba(255, 255, 255, 0.1) inset;

    transition: border-bottom-color 0.1s;
  }

  &:deep(.is-focus) {
    border-bottom-color: var(--primary-color);
  }
}
</style>
