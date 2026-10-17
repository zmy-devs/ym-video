<template>
  <section
    class="w-60 h-10 flex items-center absolute top-4 rounded-xl overflow-hidden shadow-md"
  >
    <div class="h-full bg-white"></div>

    <Icon class="absolute left-3" :icon="icon" size="20" color="#000" />
  </section>
</template>

<script setup lang="ts">
import Icon from "@/components/ui/icon/index.vue";
import { IconName } from "@/components/ui/icon";

defineProps<{
  data: number;
  icon: IconName;
}>();
</script>

<style scoped lang="scss">
section {
  background-color: rgba(110, 110, 110, 0.8);

  > div:first-child {
    width: calc(v-bind("data") * 1%);

    transition: width 0.1s;
  }
}
</style>
