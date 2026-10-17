import { appName } from "@/services/info";
import { Source } from "@type";
import { useStorage } from "@vueuse/core";

//创建配置
const createConfig = () => {
  return {
    //自动更新
    autoUpdate: true,

    //选中的源
    selectedSource: {
      label: "量子资源",
      url: "https://bfzyapi.com/api.php/provide/vod/",
    },

    //选中的仓库
    selectedRepo: {
      label: "Gitee",
      url: `https://gitee.com/yxingyus/${appName}`,
      updateUrl: `https://gitee.com/api/v5/repos/yxingyus/${appName}/releases/latest`,
    },

    //所有源
    sources: [
      {
        label: "量子资源",
        url: "https://cj.lziapi.com/api.php/provide/vod/",
      },
      {
        label: "暴风资源",
        url: "https://bfzyapi.com/api.php/provide/vod/",
      },
      {
        label: "如意资源",
        url: "http://cj.rycjapi.com/api.php/provide/vod/",
      },
      {
        label: "茅台资源",
        url: "https://caiji.maotaizy.cc/api.php/provide/vod/",
      },
      {
        label: "极速资源",
        url: "https://jszyapi.com/api.php/provide/vod/",
      },
      {
        label: "豆瓣资源",
        url: "https://dbzy.tv/api.php/provide/vod/",
      },
      {
        label: "魔都资源",
        url: "https://www.mdzyapi.com/api.php/provide/vod/",
      },
    ],
  };
};

export const useConfigStore = defineStore("config", () => {
  const config = useStorage("settings", createConfig(), localStorage, {
    mergeDefaults: true,
  });

  //切换自动更新
  const toggleAutoUpdate = () => {
    config.value.autoUpdate = !config.value.autoUpdate;
  };

  //添加源
  const addSource = (item: Source) => {
    const res = JSON.parse(JSON.stringify(item));

    config.value.sources.unshift(res);
  };

  //设置源
  const setSource = (item: Source) => {
    config.value.selectedSource = item;
  };

  //移除源
  const removeSource = (label: string) => {
    config.value.sources = config.value.sources.filter(
      item => item.label != label
    );
  };

  //重置
  const resetConfig = () => {
    config.value = createConfig();
  };

  return {
    config,
    toggleAutoUpdate,
    addSource,
    setSource,
    removeSource,
    resetConfig,
  };
});
