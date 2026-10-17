<template>
  <BaseHover :data="data">
    <span class="text-sub text-sm whitespace-pre">
      {{ sub }}
    </span>

    <span class="text-sm text-sub ellipsis-3">
      “{{ data.content || "暂无剧情简介......" }}”
    </span>
  </BaseHover>
</template>

<script setup lang="ts">
import BaseHover from "../base-hover.vue";
import { MovieInfo } from "@type";

const { data } = defineProps<{
  data: MovieInfo;
}>();

const sub = computed(() => {
  return `${data.year}  |  ${data.area}  |  ${data.lang}`;
});
</script>

<style scoped lang="scss">
.card-hover {
  width: 280px;

  box-shadow: rgba(0, 0, 0, 0.2) 0px 14px 28px -6px,
    rgba(0, 0, 0, 0.12) 0px 2px 4px -1px;

  transform: scale(0);

  transition: transform 0.15s;

  > section {
    box-shadow: 0 0 8px 8px var(--list-color);
  }
}
</style>
