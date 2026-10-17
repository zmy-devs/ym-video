import { BrowserWindow } from "electron";
import { join } from "path";
import { isDev } from "ym-electron.js";

export const browserWindows = new Map<string, BrowserWindow>();

//加载文件
export const load = async (bw: BrowserWindow, hash: string) => {
  //生产模式
  if (!isDev()) {
    await bw.loadFile(join(__dirname, "../renderer/index.html"), {
      hash,
    });

    bw.show();

    return;
  }

  //开发模式
  bw.webContents.openDevTools({ mode: "detach" });

  await bw.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}/#/${hash}`);

  bw.show();
};
