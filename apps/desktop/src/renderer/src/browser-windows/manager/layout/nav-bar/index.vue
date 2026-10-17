<template>
  <section
    class="nav-bar p-2 flex flex-col gap-1 bg-list border-r border-border"
  >
    <NavBarIcon />

    <NavBarItem
      label="搜索"
      tip-label="搜索想要看的影视资源"
      tip-sub="Ctrl+S"
      icon="search"
      @click="toSearch"
    />

    <NavBarItem
      label="主页"
      tip-label="最近观看、更新等内容"
      icon="home"
      to="/manager/home"
    />

    <NavBarItem
      label="历史"
      tip-label="最近观看的影视资源"
      icon="history"
      to="/manager/history"
    />

    <NavBarHistory />

    <NavBarCategory />

    <NavBarItem
      class="mt-auto"
      label="设置"
      tip-label="应用配置和设置"
      icon="setting"
      to="/manager/setting"
    />
  </section>
</template>

<script setup lang="ts">
import NavBarCategory from "./nav-bar-category.vue";
import NavBarHistory from "./nav-bar-history.vue";
import NavBarIcon from "./nav-bar-icon.vue";
import NavBarItem from "./nav-bar-Item.vue";
import eventEmitter from "@/hooks/eventEmitter";

const toSearch = () => {
  eventEmitter.emit("search:show");
};

//注册按键
onMounted(() => {
  window.addEventListener("keydown", e => {
    if (e.ctrlKey && e.key == "s") {
      e.preventDefault();

      toSearch();
    }
  });
});
</script>

<style scoped lang="scss">
.nav-bar {
  grid-area: nav-bar;
}
</style>
