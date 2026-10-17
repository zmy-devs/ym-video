import eventEmitter from "@/hooks/eventEmitter";
import { getUpdate } from "@/services/api";
import * as db from "@/services/db";
import { HistoryInfo, MovieInfo } from "@/type";
import { proxy } from "valtio";
import { proxyMap } from "valtio/utils";

type HistoryState = {
  data: Map<string, HistoryInfo>;
};

//数据
export const historyState = proxy<HistoryState>({
  data: proxyMap(),
});

// 添加历史记录
export const addHistory = (info: MovieInfo) => {
  if (historyState.data.has(info.id)) {
    return historyState.data.get(info.id)!;
  }

  const data: HistoryInfo = {
    ...info,
    history: 0,
    progress: [],
    time: Date.now(),
  };

  historyState.data.set(info.id, data);

  db.insert(data);

  return data;
};

//判断是否存在
export const hasHistory = (id: string) => {
  return historyState.data.has(id);
};

//移除历史记录
export const removeHistory = async (id: string) => {
  if (!hasHistory(id)) {
    return;
  }

  historyState.data.delete(id);

  db.remove(id);
};

//清空历史记录
export const clearHistory = async () => {
  historyState.data.clear();

  db.clear();
};

//更新集数
const updateHistorys = async (historys: Map<string, HistoryInfo>) => {
  const group: Record<string, string[]> = {};

  //分组
  historys.forEach(({ source }) => {
    if (!(source.url in group)) {
      group[source.url] = [];
    }

    group[source.url].push(source.id);
  });

  //获取更新
  const res = await Promise.all(
    Object.entries(group).map(item => getUpdate(...item)),
  );

  //设置更新
  for (const group of res) {
    for (const item of group) {
      const old = historys.get(item.id)!;

      historys.set(item.id, { ...old, ...item });
    }
  }
};

//初始化
const init = async () => {
  const res = await db.select();

  if (res.length == 0) {
    return;
  }

  const map = new Map(res.map(item => [item.id, item]));

  await updateHistorys(map);

  historyState.data = proxyMap(map);
};

//监听修改
eventEmitter.on("saveHistory", data => {
  if (!hasHistory(data.id)) {
    return;
  }

  historyState.data.set(data.id, data);

  db.update(data);
});

init();
