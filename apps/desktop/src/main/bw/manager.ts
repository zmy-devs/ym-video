import { join } from "path";
import { BrowserWindow } from "electron";
import { browserWindows, load } from "./index";
import Store from "electron-store";

const store = new Store();

let lastSize = store.get("manager-window-size", {
  width: 1024,
  height: 768,
}) as Electron.Size;

export const createManage = async () => {
  const bw = new BrowserWindow({
    show: false,
    width: lastSize.width,
    height: lastSize.height,

    minWidth: 1000,
    minHeight: 750,

    titleBarStyle: "hidden",
    titleBarOverlay: {
      symbolColor: "#d4d4d4",
      color: "rgba(0,0,0,0)",
      height: 44,
    },

    webPreferences: {
      preload: join(__dirname, "../preload/manager.mjs"),
      sandbox: false,
    },
  });

  //处理窗口调整大小
  const handleResized = () => {
    const [width, height] = bw.getSize();

    const option = {
      width,
      height,
    };

    lastSize = option;

    store.set("manager-window-size", option);
  };

  //处理窗口准备关闭
  const handleClose = (e: Electron.Event) => {
    //如果只有一个窗口直接关闭
    if (browserWindows.size == 1) {
      return;
    }

    e.preventDefault();

    bw.hide();
  };

  browserWindows.set("manager", bw);

  bw.on("close", handleClose);
  bw.on("resized", handleResized);

  await load(bw, "manager");

  return bw;
};
