import { join } from "path";
import { BrowserWindow } from "electron";
import { browserWindows, load } from "./index";
import Store from "electron-store";

const store = new Store();

let lastSize = store.get("player-window-size", {
  width: 1024,
  height: 768,
}) as Electron.Size;

export const createPlayer = async (id: string = "player") => {
  if (browserWindows.has(id)) {
    const win = browserWindows.get(id)!;

    win.show();
    win.focus();

    return win;
  }

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
      preload: join(__dirname, "../preload/player.mjs"),
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

    store.set("player-window-size", option);
  };

  //处理窗口关闭
  const handleClosed = () => {
    browserWindows.delete(id);

    const win = browserWindows.get("manager")!;

    win.show();
  };

  browserWindows.set(id, bw);

  bw.on("closed", handleClosed);
  bw.on("resized", handleResized);

  await load(bw, "player");

  return bw;
};
