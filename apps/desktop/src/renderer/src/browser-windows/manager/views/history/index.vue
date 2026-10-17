<template>
  <Content class="relative" label="历史">
    <Empty
      class="absolute inset-0"
      label="暂无更多历史记录..."
      v-if="sections.length == 0"
    />

    <main class="py-6" v-else>
      <ContentGroup
        v-for="group in sections"
        :key="group.title"
        :label="group.title"
      >
        <div class="grid grid-list gap-x-4 gap-y-6">
          <CardHistory v-for="item of group.data" :key="item.id" :data="item" />
        </div>
      </ContentGroup>
    </main>
  </Content>
</template>

<script setup lang="ts">
import ContentGroup from "@manager/components/content/content-group.vue";
import CardHistory from "@manager/components/card/card-history/index.vue";
import Content from "@manager/components/content/index.vue";
import Empty from "@manager/components/empty.vue";
import { useHistoryStore } from "@manager/stores/useHistoryStore";
import { groupByTime } from "@/utils/group";

const { historys } = storeToRefs(useHistoryStore());

const sections = computed(() => {
  const res = groupByTime(historys.value, item => item.time);

  return res.filter(item => item.data.length > 0);
});
</script>

<style scoped lang="scss"></style>
