import { File, Paths } from "expo-file-system";
import { formatVersion } from "./format";
import {
  deleteAsync,
  createDownloadResumable,
  getContentUriAsync,
} from "expo-file-system/legacy";
import { startActivityAsync } from "expo-intent-launcher";

interface UpdateInfo {
  assets: {
    browser_download_url: string;
    name: string;
  }[];
  name: string;
  tag_name: string;
}

interface UpdateConfig {
  md5: string;
  version: string;
  name: string;
}

let checkUpdateInfo = {
  md5: "",
  version: "",
  url: "",
};

//检查更新
export const checkUpdate = async (url: string, appVersion: string) => {
  const response = await fetch(url);

  if (response.status != 200) {
    console.error("源地址无法访问", url);

    return false;
  }

  const updateInfo: UpdateInfo = await response.json();

  //找到对应的配置信息
  const latestConfig = updateInfo.assets.find(
    item => item.name == "latest.json"
  );

  //没有配置
  if (!latestConfig) {
    console.error("没有找到latest.json文件");

    return false;
  }

  const res = await fetch(latestConfig.browser_download_url);

  const { md5, version, name }: UpdateConfig = await res.json();

  //不需要更新
  if (formatVersion(appVersion) >= formatVersion(version)) {
    console.log("不需要更新");

    return false;
  }

  //找到对应的安装包
  const info = updateInfo.assets.find(item => item.name == name);

  //没有安装包
  if (!info) {
    console.error("没有找到对应的安装包", name);

    return false;
  }

  checkUpdateInfo = {
    version,
    url: info.browser_download_url,
    md5,
  };

  return version;
};

//下载
export const downloadUpdate = async (
  url: string,
  downloadFile: File,
  onProgress?: (percent: number) => void
) => {
  if (downloadFile.exists) {
    await deleteAsync(downloadFile.uri);
  }

  const downloadResumable = createDownloadResumable(
    url,
    downloadFile.uri,
    {},
    downloadProgress => {
      if (!onProgress) {
        return;
      }

      const progress = Math.floor(
        (downloadProgress.totalBytesWritten /
          downloadProgress.totalBytesExpectedToWrite) *
          100
      );

      onProgress(progress);
    }
  );

  const res = await downloadResumable.downloadAsync();

  if (res?.status == 200) {
    return downloadFile.uri;
  }

  return false;
};

//安装
export const installUpdate = async (uri: string) => {
  const contentUri = await getContentUriAsync(uri);

  await startActivityAsync("android.intent.action.VIEW", {
    data: contentUri,
    flags: 1,
    type: "application/vnd.android.package-archive",
  });
};

//下载更新并安装
export const downloadAndInstall = async (
  onProgress?: (percent: number) => void
) => {
  const file = new File(Paths.cache, "ym-video-update.exe");

  if (file.md5 == checkUpdateInfo.md5) {
    return () => {
      installUpdate(file.uri);
    };
  }

  //下载
  await downloadUpdate(checkUpdateInfo.url, file, onProgress);

  return () => {
    installUpdate(file.uri);
  };
};
