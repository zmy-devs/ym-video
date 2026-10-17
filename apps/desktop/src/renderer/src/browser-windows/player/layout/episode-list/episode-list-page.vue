<template>
  <section class="w-full flex items-center">
    <ElTooltip
      effect="light"
      :show-arrow="false"
      trigger="click"
      popper-class="episode-list-page p-unset"
      v-if="pageCount > 1"
    >
      <button class="px-2 shrink-0 text-main">全部</button>

      <template #content>
        <ElScrollbar
          max-height="40vh"
          view-class="p-2 flex flex-col items-center gap-1"
        >
          <ListItem
            v-for="item in pageList"
            :key="item.value"
            :label="item.label"
            :active="item.value == currentPage"
            @click="handleClick(item.value)"
          />
        </ElScrollbar>
      </template>
    </ElTooltip>

    <div class="flex overflow-hidden">
      <ListItem
        v-for="item in pageList"
        :key="item.value"
        :label="item.label"
        :active="item.value == currentPage"
        ref="episodeItem"
        @click="handleClick(item.value)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ElTooltip, ElScrollbar } from "element-plus";
import ListItem from "@/components/list-item.vue";
import { useEpisodeStore } from "@player/stores/useEpisodeStore";

const { pageList, pageCount, currentPage } = storeToRefs(useEpisodeStore());

const episodeItemRef = useTemplateRef("episodeItem");

const handleClick = (value: number) => {
  currentPage.value = value;
};

watchEffect(() => {
  if (!episodeItemRef.value) {
    return;
  }

  const item: HTMLDivElement = episodeItemRef.value[currentPage.value]!.$el;

  item.scrollIntoView({
    behavior: "smooth",
    inline: "center",
  });
});
</script>

<style lang="scss">
.episode-list-page {
  --el-bg-color-overlay: var(--list-color);
}
</style>
