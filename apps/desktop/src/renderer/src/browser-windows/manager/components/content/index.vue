<template>
  <ElScrollbar
    view-class="min-h-full flex flex-col"
    @end-reached="handleEnd"
    :distance="10"
  >
    <div class="content mx-auto w-4/5 flex-1 flex flex-col">
      <span
        class="mt-6 text-3xl font-bold text-main"
        :class="`${position == 'center' && ' text-center'}`"
        v-if="label"
      >
        {{ label }}
      </span>

      <slot></slot>
    </div>
  </ElScrollbar>
</template>

<script setup lang="ts">
import { ElScrollbar, ScrollbarDirection } from "element-plus";

withDefaults(
  defineProps<{
    label?: string;
    position?: "center" | "left";
  }>(),
  {
    position: "left",
  }
);

const emits = defineEmits<{
  endReached: [];
}>();

const handleEnd = (direction: ScrollbarDirection) => {
  if (direction != "bottom") {
    return;
  }

  emits("endReached");
};
</script>

<style scoped lang="scss">
.content {
  max-width: 1160px;
}
</style>
