import { IpcMainWrapper } from "ym-electron.js";
import { IpcEvent } from "@type";

export const ipcMain = new IpcMainWrapper<IpcEvent>();
