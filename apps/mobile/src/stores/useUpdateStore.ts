import { appVersion } from "@/services/info";
import { proxy } from "valtio";
import storage from "@/services/storage";
import { configState } from "./useConfigStore";
import { getDayDiff } from "@/utils/time";
import {
  checkUpdate as _checkUpdate,
  downloadAndInstall,
} from "@/utils/update";
import { confirm } from "@/components/dialog";

type UpdateState = {
  lastUpdateTime: number;

  downloadProgress: number;

  updateVersion: string;

  updateStatus:
    | "init"
    | "checking"
    | "update-available"
    | "update-not-available"
    | "downloading"
    | "downloaded";
};

export const updateState = proxy<UpdateState>({
  //上次检测时间
  lastUpdateTime: Number(storage.getItem("lastUpdateTime")) || 0,

  //更新进度
  downloadProgress: 0,

  //更新信息
  updateVersion: "",

  //更新状态
  updateStatus: "init",
});

//检查更新
export const checkUpdate = async () => {
  const installUpdate = async () => {
    //安装
    const installResult = await confirm({
      title: "安装更新",
      content: "更新下载完成是否安装",
    });

    //不安装
    if (!installResult) {
      return;
    }

    setLastUpdateTime();

    install();
  };

  //如果下载完成就直接安装
  if (updateState.updateStatus == "downloaded") {
    installUpdate();
    return;
  }

  //如果不是初始化就进制检查
  if (updateState.updateStatus != "init") {
    return;
  }

  updateState.updateStatus = "checking";

  const res = await _checkUpdate(
    configState.selectedRepo.updateUrl,
    appVersion
  );

  //没有更新
  if (res == false) {
    setLastUpdateTime();

    updateState.updateStatus = "update-not-available";

    return;
  }

  updateState.updateVersion = res;

  updateState.updateStatus = "update-available";

  const checkResult = await confirm({
    title: "更新版本",
    content: `发现新版本${res},是否更新?`,
  });

  //不更新
  if (!checkResult) {
    updateState.updateStatus = "init";
    return;
  }

  updateState.updateStatus = "downloading";

  const install = await downloadAndInstall(progress => {
    updateState.downloadProgress = progress;
  });

  updateState.updateStatus = "downloaded";

  installUpdate();
};

//保存
export const setLastUpdateTime = () => {
  const date = Date.now();

  updateState.lastUpdateTime = date;

  storage.setItem("lastUpdateTime", JSON.stringify(date));
};

//初始化
const init = () => {
  if (!configState.autoUpdate) {
    return;
  }

  const day = getDayDiff(updateState.lastUpdateTime, Date.now());

  if (day < 3) {
    return;
  }

  checkUpdate();
};

init();
