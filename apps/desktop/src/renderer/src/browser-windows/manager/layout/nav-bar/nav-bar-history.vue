<template>
  <NavBarLabel label="最近" v-if="historyData.length" />

  <NavBarItem
    v-for="item in historyData"
    :key="item.id"
    :label="item.name"
    :tip-label="item.name"
    @click="handleClick(item)"
    @contextmenu="e => handleContextmenu(e, item)"
  >
    <template #icon>
      <Image class="size-5 rounded-full overflow-hidden" :src="item.pic" />
    </template>
  </NavBarItem>
</template>

<script setup lang="ts">
import NavBarLabel from "./nav-bar-label.vue";
import Image from "@/components/image.vue";
import NavBarItem from "./nav-bar-Item.vue";
import { useHistoryStore } from "@manager/stores/useHistoryStore";
import { HistoryInfo } from "@type";
import eventEmitter from "@/hooks/eventEmitter";

const { historys } = storeToRefs(useHistoryStore());

//3条历史信息
const historyData = computed(() => {
  return Array.from(historys.value.values())
    .sort((a, b) => b.time - a.time)
    .slice(0, 4);
});

//处理点击
const handleClick = (data: HistoryInfo) => {
  ipcRenderer.invoke("openPlayer", toRaw(data));
};

//处理菜单
const handleContextmenu = (e: MouseEvent, data: HistoryInfo) => {
  eventEmitter.emit("history:menu:show", e, data);
};
</script>

<style scoped lang="scss"></style>
