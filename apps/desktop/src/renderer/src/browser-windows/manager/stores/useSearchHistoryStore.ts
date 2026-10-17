import { SearchHistory } from "@type";

export const useSearchHistoryStore = defineStore("search", () => {
  const searchHistorys = ref<Map<string, SearchHistory>>(new Map());

  //添加搜索历史
  const addSearchHistory = (keyword: string) => {
    if (searchHistorys.value.has(keyword)) {
      searchHistorys.value.get(keyword)!.time = Date.now();
      return;
    }

    searchHistorys.value.set(keyword, {
      label: keyword,
      time: Date.now(),
    });
  };

  //删除搜索历史
  const removeSearchHistory = (keyword: string) => {
    if (!searchHistorys.value.has(keyword)) {
      return;
    }

    searchHistorys.value.delete(keyword);
  };

  //清空历史记录
  const clearSearchHistory = () => {
    searchHistorys.value.clear();
  };

  //保存
  const saveSearchHistory = () => {
    const res = JSON.stringify(Array.from(searchHistorys.value));

    localStorage.setItem("search-history", res);
  };

  //初始化
  const init = () => {
    const res = localStorage.getItem("search-history");

    if (res) {
      searchHistorys.value = new Map(JSON.parse(res));
    }

    watch(
      searchHistorys,
      () => {
        saveSearchHistory();
      },
      {
        deep: true,
      }
    );
  };

  init();

  return {
    searchHistorys,
    addSearchHistory,
    removeSearchHistory,
    clearSearchHistory,
  };
});
