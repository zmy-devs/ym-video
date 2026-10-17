import { browserWindows } from "@/bw";
import { createPlayer } from "@/bw/player";
import { ipcMain } from "@/ipc/ipcMain";
import * as db from "@/services/db";
import { update, updatePath } from "@/services/path";
import { getMd5 } from "@/utils/md5";
import { BrowserWindow } from "electron";
import { existsSync } from "fs";
import { mkdir } from "fs/promises";
import { checkUpdate, downloadUpdate, installUpdate } from "ym-publish";

//查询
ipcMain.handle("db:select", () => {
  return db.select();
});

//插入
ipcMain.handle("db:insert", (_, data) => {
  db.insert(data);
});

//修改
ipcMain.handle("db:update", (_, data) => {
  const win = browserWindows.get("manager")!;

  db.update(data);

  win.webContents.send("saveHistory", data);
});

//删除
ipcMain.handle("db:remove", (_, id) => {
  db.remove(id);
});

//清空
ipcMain.handle("db:reset", () => {
  db.reset();
});

//请求
ipcMain.handle("request", async (_, url) => {
  const response = await fetch(url);

  return await response.json();
});

//播放视频
ipcMain.handle("openPlayer", async (_, data, isReset) => {
  const win = await createPlayer();

  win.setTitle(data.name);

  win.webContents.send("openPlayer", data, isReset);

  //隐藏主页面
  const managerWin = browserWindows.get("manager")!;

  managerWin.hide();
});

let checkUpdateInfo = {
  md5: "",
  version: "",
  url: "",
};

//检查更新
ipcMain.handle("checkUpdata", async (_, url) => {
  const res = await checkUpdate(url, __APP_VERSION__);

  if (res == false) {
    return false;
  }

  checkUpdateInfo = res;

  return res.version;
});

//下载并安装
ipcMain.handle("downloadUpdate", async e => {
  const win = BrowserWindow.fromWebContents(e.sender)!;

  //不存在更新文件夹就创建
  if (!existsSync(update)) {
    await mkdir(update, { recursive: true });
  }

  //如果下载完成就安装
  const md5 = await getMd5(updatePath);

  if (md5 == checkUpdateInfo.md5) {
    return true;
  }

  //下载
  try {
    await downloadUpdate(checkUpdateInfo.url, updatePath, percent => {
      win.webContents.send("updateProgress", Math.floor(percent));
    });
  } catch {
    return false;
  }

  return true;
});

//安装
ipcMain.handle("installUpdate", () => {
  installUpdate(updatePath, true);
});
