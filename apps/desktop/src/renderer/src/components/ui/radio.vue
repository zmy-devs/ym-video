<template>
  <button
    class="flex-center aspect-square rounded-full border-main-dark2"
    :class="`${active ? 'bg-primary' : 'border'}`"
    @click="emits('click')"
  >
    <div
      class="aspect-square rounded-full"
      :class="`${active && 'bg-white'}`"
    ></div>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  active?: boolean;
  height: number;
}>();

const emits = defineEmits<{
  click: [];
}>();
</script>

<style scoped lang="scss">
button {
  height: calc(v-bind("height") * 1px);

  > div {
    height: calc(v-bind("height / 2") * 1px);
  }
}
</style>
