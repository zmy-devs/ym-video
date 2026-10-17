<template>
  <ElScrollbar max-height="320px" v-if="searchHistorys.size != 0">
    <main class="px-2 pb-2 flex flex-col gap-0.5">
      <Item
        v-for="(item, index) in searchHistoryData"
        :key="item.label"
        :data="item"
        :active="selectedIndex == index"
        @click="handleClick(item.label)"
        @contextmenu="searchHistoryMenuRef?.open"
        @mouseenter="handleMouseenter(index)"
      />
    </main>
  </ElScrollbar>

  <MenuContext :data="menu" ref="searchHistoryMenuRef" />
</template>

<script setup lang="ts">
import { useSearchHistoryStore } from "@manager/stores/useSearchHistoryStore";
import Item from "./content-item.vue";
import { ElScrollbar } from "element-plus";
import { MenuGroup, MenuContext } from "@/components/ui/menu";
import eventEmitter from "@/hooks/eventEmitter";

const { searchHistorys } = storeToRefs(useSearchHistoryStore());
const { removeSearchHistory } = useSearchHistoryStore();

const emits = defineEmits<{
  search: [keyword: string];
}>();

//搜索历史菜单
const searchHistoryMenuRef = useTemplateRef("searchHistoryMenuRef");

//当前选中索引
const selectedIndex = ref(0);

//排序数据
const searchHistoryData = computed(() => {
  return Array.from(searchHistorys.value.values()).sort(
    (a, b) => b.time - a.time
  );
});

//处理点击搜索
const handleClick = (keyword: string) => {
  emits("search", keyword);
};

//鼠标悬浮
const handleMouseenter = (index: number) => {
  selectedIndex.value = index;
};

//上下按键
const handleMove = (e: KeyboardEvent) => {
  const len = searchHistoryData.value.length;
  if (len === 0) return;

  if (e.key === "ArrowUp") {
    selectedIndex.value = (selectedIndex.value - 1 + len) % len;
    return;
  }

  if (e.key === "ArrowDown") {
    selectedIndex.value = (selectedIndex.value + 1) % len;
    return;
  }

  if (e.key == "Enter") {
    const keyword = searchHistoryData.value[selectedIndex.value].label;
    handleClick(keyword);
    return;
  }
};

const menu: MenuGroup[] = [
  {
    label: "搜索历史",
    children: [
      {
        label: "搜索",
        icon: "search",
        onSelect: handleClick,
      },
    ],
  },
  {
    children: [
      {
        label: "删除当前搜索历史记录",
        icon: "remove",
        hoverColor: "#EB5757",
        onSelect(keyword: string) {
          removeSearchHistory(keyword);

          eventEmitter.emit("success:show", "删除成功");
        },
      },
    ],
  },
];

onMounted(() => {
  window.addEventListener("keydown", handleMove);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleMove);
});
</script>

<style scoped lang="scss"></style>
