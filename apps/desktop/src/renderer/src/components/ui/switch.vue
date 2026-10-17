<template>
  <button
    class="p-0.5 rounded-full"
    :class="`${model ? 'bg-primary' : 'bg-444'}`"
    @click="handleClick"
  >
    <div class="h-full aspect-square rounded-full bg-white"></div>
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    height?: number;
  }>(),
  {
    height: 20,
  }
);

const model = defineModel<boolean>();

const handleClick = () => {
  model.value = !model.value;
};
</script>

<style scoped lang="scss">
button {
  width: calc((v-bind("height") * 1.8px));
  height: calc((v-bind("height") * 1px));

  > div {
    transform: translateX(calc((v-bind("model?height*0.8:0") * 1px)));

    transition: 0.1s;
  }
}
</style>
