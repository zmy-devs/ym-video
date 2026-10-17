<template>
  <div
    class="flex-center fixed inset-0 z-50"
    @click.self="handleClose"
    v-if="visible"
  >
    <main class="w-full flex flex-col absolute rounded-lg bg-list">
      <SearchBarInput @search="handleSearch" />

      <SearchBarContent @search="handleSearch" />
    </main>
  </div>
</template>

<script setup lang="ts">
import SearchBarInput from "./search-bar-input.vue";
import SearchBarContent from "./search-bar-content/index.vue";
import eventEmitter from "@/hooks/eventEmitter";
import { useSearchMovieStore } from "@manager/stores/useSearchMovieStore";
import { useSearchHistoryStore } from "@manager/stores/useSearchHistoryStore";

const { addSearchHistory } = useSearchHistoryStore();
const { searchData } = useSearchMovieStore();
const router = useRouter();

const visible = ref(false);

//处理关闭
const handleClose = () => {
  visible.value = false;
};

//搜索
const handleSearch = (keyword: string) => {
  addSearchHistory(keyword);

  searchData(keyword);

  handleClose();

  router.push("/manager/search");
};

eventEmitter.on("search:show", () => {
  visible.value = true;
});
</script>

<style scoped lang="scss">
main {
  max-height: 50vh;
  max-width: 650px;

  top: 88px;

  box-shadow: 0 0 0 1px #30302e, 0px 24px 48px -8px #0000007a,
    0px 4px 12px -1px #0000003d;
}
</style>
