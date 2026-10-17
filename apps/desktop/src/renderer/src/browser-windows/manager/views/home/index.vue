<template>
  <Content :label="`${getTimePeriod()}好，亲爱的用户😊`" position="center">
    <main class="py-6 flex flex-col flex-1">
      <ContentGroup label="最近观看" v-if="historyData.length">
        <div class="grid grid-list gap-x-4 gap-y-6">
          <CardHistory
            v-for="item of historyData"
            :key="item.name"
            :data="item"
          />
        </div>
      </ContentGroup>

      <ContentGroup class="flex-1" label="最近更新">
        <Loading class="flex-1" v-if="latestMovies.length == 0" />

        <div class="grid grid-list gap-x-4 gap-y-6" v-else>
          <CardMovie
            v-for="item of latestMovies"
            :key="item.name"
            :data="item"
          />
        </div>
      </ContentGroup>
    </main>
  </Content>
</template>

<script setup lang="ts">
import ContentGroup from "@manager/components/content/content-group.vue";
import Content from "@manager/components/content/index.vue";
import CardMovie from "@manager/components/card/card-movie/index.vue";
import CardHistory from "@manager/components/card/card-history/index.vue";
import { useHistoryStore } from "@manager/stores/useHistoryStore";
import { useLatestMovieStore } from "@manager/stores/useLatestMovieStore";
import { getTimePeriod } from "@/utils/time";
import Loading from "@/components/ui/loading/index.vue";

const { historys } = storeToRefs(useHistoryStore());
const { latestMovies } = storeToRefs(useLatestMovieStore());

const historyData = computed(() => {
  return Array.from(historys.value.values())
    .sort((a, b) => b.time - a.time)
    .slice(0, 6);
});
</script>

<style scoped lang="scss"></style>
