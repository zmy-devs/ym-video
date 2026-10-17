<template>
  <button class="w-9 h-9 flex-center rounded-full" @click="emits('click')">
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  label?: string;
}>();

const emits = defineEmits<{
  click: [];
}>();
</script>

<style scoped lang="scss">
button {
  background-color: rgba(100, 100, 100, 0.8);
  box-shadow: 0 1px 5px 0 rgba(#000, 0.5);
}
</style>
