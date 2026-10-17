<template>
  <div class="manager-window wh-screen grid bg-bg">
    <TitleBar />

    <NavBar />

    <RouterView />

    <SearchBar />

    <MenuContext :data="historyMenu" ref="historyContextMenu" />
  </div>
</template>

<script setup lang="ts">
import SearchBar from "./search-bar/index.vue";
import NavBar from "./nav-bar/index.vue";
import TitleBar from "./title-bar/index.vue";
import { useConfigStore } from "@manager/stores/useConfigStore";
import { useMovieStore } from "@manager/stores/useMovieStore";
import { useLatestMovieStore } from "@manager/stores/useLatestMovieStore";
import { MenuContext, MenuGroup } from "@/components/ui/menu";
import eventEmitter from "@/hooks/eventEmitter";
import { useHistoryStore } from "@manager/stores/useHistoryStore";
import { HistoryInfo } from "@type";
import { formatSeconde } from "@/utils/format";
import { useUpdateStore } from "@manager/stores/useUpdateStore";

//解决不会自动检查更新的bug
useUpdateStore();
const { config } = storeToRefs(useConfigStore());
const movieStore = useMovieStore();
const latestMovieStore = useLatestMovieStore();
const historyStore = useHistoryStore();

const historyMenuRef = useTemplateRef("historyContextMenu");

//更新源
watch(
  () => config.value.selectedSource,
  () => {
    latestMovieStore.init();
    movieStore.init();
  },
  {
    immediate: true,
  }
);

const historyMenu: MenuGroup[] = [
  {
    label: "历史",
    children: [
      {
        label: "继续播放",
        icon: "play",
        sub: (data: HistoryInfo) =>
          formatSeconde(data.progress[data.history]?.currentTime || 0),
        onSelect(data: HistoryInfo) {
          ipcRenderer.invoke("openPlayer", toRaw(data));
        },
      },
      {
        label: "从头播放",
        icon: "play",
        onSelect(data: HistoryInfo) {
          ipcRenderer.invoke("openPlayer", toRaw(data), true);
        },
      },
    ],
  },
  {
    children: [
      {
        label: "删除当前历史记录",
        icon: "remove",
        hoverColor: "#EB5757",
        onSelect(data: HistoryInfo) {
          historyStore.removeHistory(data.id);

          eventEmitter.emit("success:show", "删除成功");
        },
      },
    ],
  },
];

eventEmitter.on("history:menu:show", (e, data) => {
  historyMenuRef.value?.open(e, data);
});
</script>

<style lang="scss">
.manager-window {
  grid-template-rows: 44px calc(100vh - 44px);
  grid-template-columns: 260px calc(100vw - 260px);

  grid-template-areas:
    "nav-bar title-bar"
    "nav-bar content";
}
</style>
