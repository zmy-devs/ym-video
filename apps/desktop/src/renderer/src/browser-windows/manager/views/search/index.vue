<template>
  <Content class="relative" :label="label" @end-reached="handleEnd">
    <Loading
      class="absolute inset-0"
      v-if="searchMovies.length == 0 && status == 'loading'"
    />

    <Empty
      class="absolute inset-0"
      label="暂无更多搜索结果..."
      v-if="status == 'empty'"
    />

    <main class="py-6 flex flex-col gap-6" v-else>
      <div class="grid grid-list gap-x-4 gap-y-6">
        <CardMovie v-for="item of searchMovies" :key="item.id" :data="item" />
      </div>

      <SearchMore />
    </main>
  </Content>
</template>

<script setup lang="ts">
import Loading from "@/components/ui/loading/index.vue";
import SearchMore from "./search-more.vue";
import Content from "@manager/components/content/index.vue";
import Empty from "@manager/components/empty.vue";
import CardMovie from "@manager/components/card/card-movie/index.vue";
import { useSearchMovieStore } from "@manager/stores/useSearchMovieStore";
import useLoading from "@/hooks/useLoading";

const { searchMovies, keyword, status } = storeToRefs(useSearchMovieStore());
const { loadData } = useSearchMovieStore();
const handleEnd = useLoading(loadData);

//标题
const label = computed(() => {
  return `"${keyword.value}"的搜索结果`;
});
</script>

<style scoped lang="scss"></style>
