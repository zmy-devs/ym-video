<template>
  <button
    type="button"
    class="h-8 px-4 flex-center rounded text-sm"
    :class="type"
    @click="emits('click')"
  >
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: "primary" | "default";
  }>(),
  {
    type: "default",
  }
);

const emits = defineEmits<{
  click: [];
}>();
</script>

<style scoped lang="scss">
button {
  transition: background-color 0.1s;
}

.primary {
  color: #fff;
  background-color: var(--primary-color);

  &:hover {
    background-color: var(--primary-dark-color);
  }
}

.default {
  color: var(--main-color);
  background-color: #303030;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1),
    0 0.5px 0 0 rgba(255, 255, 255, 0.1) inset;

  &:hover {
    background-color: #383838;
  }
}
</style>
