<template>
  <Content class="relative" :label="label" @end-reached="handleEnd">
    <Loading
      class="absolute inset-0 pointer-events-none"
      v-if="movies.length == 0"
    />

    <main class="py-6 flex flex-col gap-4">
      <CategoryList />

      <div class="grid grid-list gap-x-4 gap-y-6">
        <CardMovide v-for="item of movies" :key="item.id" :data="item" />
      </div>

      <CategoryMore />
    </main>
  </Content>
</template>

<script setup lang="ts">
import Loading from "@/components/ui/loading/index.vue";
import CategoryList from "./category-list.vue";
import CategoryMore from "./category-more.vue";
import Content from "@manager/components/content/index.vue";
import { useMovieStore } from "@manager/stores/useMovieStore";
import CardMovide from "@manager/components/card/card-movie/index.vue";
import useLoading from "@/hooks/useLoading";

const { movies } = storeToRefs(useMovieStore());
const { loadData, setCategory, getCategoryLabel } = useMovieStore();
const handleEnd = useLoading(loadData);
const route = useRoute();

//标题
const label = computed(() => {
  return getCategoryLabel(route.query.id as string);
});

//切换分类触发
onBeforeRouteUpdate(route => {
  setCategory(Number(route.query.id));
});
</script>

<style scoped lang="scss"></style>
