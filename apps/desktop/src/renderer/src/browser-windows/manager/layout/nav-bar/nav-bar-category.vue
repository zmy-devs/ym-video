<template>
  <NavBarLabel label="分类" />

  <ElScrollbar class="-mx-2" view-class="px-2 flex flex-col gap-1">
    <NavBarSkeleton
      :class="`${item % 2 == 0 ? 'w-2/3' : 'w-3/4'}`"
      v-for="item in 10"
      :key="item"
      v-if="categoryData.length == 0"
    />

    <NavBarItem
      v-for="item in categoryData"
      :key="item.id"
      :label="item.label"
      icon="film"
      :to="`/manager/category?id=${item.id}`"
      :active="Number(route.query.id) == item.id"
    />
  </ElScrollbar>
</template>

<script setup lang="ts">
import NavBarSkeleton from "./nav-bar-skeleton.vue";
import { ElScrollbar } from "element-plus";
import NavBarLabel from "./nav-bar-label.vue";
import NavBarItem from "./nav-bar-Item.vue";
import { useMovieStore } from "@manager/stores/useMovieStore";

const { category } = storeToRefs(useMovieStore());
const route = useRoute();

//分类数据
const categoryData = computed(() => {
  return Array.from(category.value.values());
});
</script>

<style lang="scss"></style>
