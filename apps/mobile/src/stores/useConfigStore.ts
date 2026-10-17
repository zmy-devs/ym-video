import useStoreRef from "@/hooks/useStoreRef";
import { Repo, Source } from "@/type";

//创建配置
const createConfig = () => {
  return {
    //自动更新
    autoUpdate: true,

    //源名称
    selectedSource: {
      label: "量子资源",
      url: "https://cj.lziapi.com/api.php/provide/vod/",
    },

    //仓库名称
    selectedRepo: {
      label: "Gitee",
      url: "https://gitee.com/yxingyus/ym-video-app",
      updateUrl:
        "https://gitee.com/api/v5/repos/yxingyus/ym-video-app/releases/latest",
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

export const configState = useStoreRef(createConfig(), "config");

//切换自动更新
export const toggleAutoUpdate = () => {
  configState.autoUpdate = !configState.autoUpdate;
};

//更新源名称
export const setSource = (option: { label: string; url: string }) => {
  configState.selectedSource = option;
};

//添加源
export const addSource = (item: Source) => {
  configState.sources.unshift(item);
};

//移除源
export const removeSource = (label: string) => {
  configState.sources = configState.sources.filter(item => item.label != label);
};

//更新仓库
export const setRepo = (option: Repo) => {
  configState.selectedRepo = option;
};
