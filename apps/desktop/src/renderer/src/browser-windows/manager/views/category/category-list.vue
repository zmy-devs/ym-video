<template>
  <header class="flex flex-wrap gap-y-2">
    <Item
      v-for="item in childCategoryData"
      :label="item.label"
      :active="selectedChildCategoryID == item.id"
      @click="setChildCategory(item.id)"
    />
  </header>
</template>

<script setup lang="ts">
import { useMovieStore } from "@manager/stores/useMovieStore";
import Item from "@/components/list-item.vue";

const { childCategory, selectedCategoryID, selectedChildCategoryID } =
  storeToRefs(useMovieStore());
const { setChildCategory } = useMovieStore();

//子分类数据
const childCategoryData = computed(() => {
  const child = childCategory.value.get(selectedCategoryID.value);

  if (!child) return [];

  return Array.from(child.values());
});
</script>

<style scoped lang="scss"></style>
