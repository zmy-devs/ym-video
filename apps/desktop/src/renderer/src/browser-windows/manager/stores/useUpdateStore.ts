import { useConfigStore } from "@manager/stores/useConfigStore";
import eventEmitter from "@/hooks/eventEmitter";
import MessageBox from "@/components/ui/message-box";
import { getDayDiff } from "@/utils/time";
import Loading from "@/components/ui/loading";

type Status =
  | "init"
  | "checking"
  | "update-available"
  | "update-not-available"
  | "downloading"
  | "downloaded"
  | "error";

export const useUpdateStore = defineStore("update", () => {
  const configStore = useConfigStore();

  //状态
  const status = ref<Status>("init");

  //下载进度
  const downloadProgress = ref(0);

  //检查更新
  const checkUpdate = async () => {
    try {
      const installUpdate = async () => {
        //安装
        const installResult = await MessageBox.confirm({
          label: "安装更新",
          content: "更新下载完成是否安装",
        });

        //不安装
        if (!installResult) {
          return;
        }

        save();

        Loading.service();

        await ipcRenderer.invoke("installUpdate");
      };

      //如果下载完成就直接安装
      if (status.value == "downloaded") {
        installUpdate();
        return;
      }

      status.value = "checking";

      const res = await ipcRenderer.invoke(
        "checkUpdata",
        configStore.config.selectedRepo.updateUrl
      );

      //没有更新
      if (res == false) {
        save();

        status.value = "update-not-available";

        return;
      }

      status.value = "update-available";

      const checkResult = await MessageBox.confirm({
        label: "🎉发现更新",
        content: `发现新版本${res},是否更新?`,
      });

      //不更新
      if (!checkResult) {
        status.value = "init";
        return;
      }

      status.value = "downloading";

      await ipcRenderer.invoke("downloadUpdate");

      status.value = "downloaded";

      installUpdate();
    } catch (e) {
      eventEmitter.emit("error:show", "检查更新失败,请重试");

      status.value = "init";

      console.error(e);
    }
  };

  //保存
  const save = () => {
    localStorage.setItem("lastUpdateTime", String(Date.now()));
  };

  const init = () => {
    if (!configStore.config.autoUpdate) {
      return;
    }

    const lastUpdateTime = localStorage.getItem("lastUpdateTime");

    const day = getDayDiff(Number(lastUpdateTime) || 0, Date.now());

    if (day < 3) {
      return;
    }

    checkUpdate();
  };

  //监听下载进度
  ipcRenderer.on("updateProgress", (_, percrent) => {
    downloadProgress.value = percrent;

    if (percrent == 100) {
      status.value = "init";
    }
  });

  init();

  return {
    status,
    downloadProgress,
    checkUpdate,
  };
});
