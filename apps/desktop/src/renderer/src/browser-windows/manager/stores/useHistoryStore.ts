import { getUpdate } from "@/services/api";
import { HistoryInfo, MovieInfo } from "@type";

export const useHistoryStore = defineStore("history", () => {
  const historys = ref<Map<string, HistoryInfo>>(new Map());

  //判断历史记录是否存在
  const hasHistory = (id: string) => {
    return historys.value.has(id);
  };

  //添加历史记录
  const addHistory = (option: MovieInfo) => {
    if (hasHistory(option.id)) {
      return historys.value.get(option.id)!;
    }

    const value = {
      ...toRaw(option),
      history: 0,
      progress: [],
      time: Date.now(),
    };

    historys.value.set(option.id, value);

    ipcRenderer.invoke("db:insert", value);

    return value;
  };

  //移除历史记录
  const removeHistory = async (id: string) => {
    if (!hasHistory(id)) {
      return;
    }

    historys.value.delete(id);

    ipcRenderer.invoke("db:remove", id);
  };

  //清空历史记录
  const resetHistory = () => {
    historys.value.clear();

    ipcRenderer.invoke("db:reset");
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
      Object.entries(group).map(item => getUpdate(...item))
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
    const res = await ipcRenderer.invoke("db:select");

    if (res.length == 0) {
      return;
    }

    const map = new Map(res.map(item => [item.id, item]));

    await updateHistorys(map);

    historys.value = map;
  };

  //监听修改
  ipcRenderer.on("saveHistory", (_, data: HistoryInfo) => {
    if (!hasHistory(data.id)) {
      return;
    }

    historys.value.set(data.id, data);
  });

  init();

  return {
    historys,
    addHistory,
    removeHistory,
    resetHistory,
  };
});
