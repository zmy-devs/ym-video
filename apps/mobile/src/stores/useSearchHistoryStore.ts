import storage from "@/services/storage";
import { KeywordHistory } from "@/type";
import { proxy, subscribe } from "valtio";
import { proxyMap } from "valtio/utils";

//仓库
export const searchHistoryState = proxy({
  //搜索历史
  data: proxyMap<string, KeywordHistory>(),
});

//保存
export const saveSearchHistory = () => {
  const data = JSON.stringify(Array.from(searchHistoryState.data));

  storage.setItem("search-history", data);
};

//添加搜索历史
export const addSearchHistory = (keyword: string) => {
  if (searchHistoryState.data.has(keyword)) {
    return;
  }

  searchHistoryState.data.set(keyword, {
    label: keyword,
    time: Date.now(),
  });
};

//更新时间
export const updateTime = (keyword: string) => {
  searchHistoryState.data.get(keyword)!.time = Date.now();
};

//删除搜索历史
export const removeSearchHistory = (keyword: string) => {
  if (!searchHistoryState.data.has(keyword)) {
    return;
  }

  searchHistoryState.data.delete(keyword);
};

//清空历史记录
export const clearSearchHistory = () => {
  searchHistoryState.data.clear();
};

//初始化
const init = () => {
  const res = storage.getItem("search-history");

  if (res) {
    searchHistoryState.data = proxyMap(JSON.parse(res));
  }

  subscribe(searchHistoryState.data, () => {
    saveSearchHistory();
  });
};

init();
