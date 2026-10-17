import { IpcRendererWrapper } from "ym-electron.js";
import { IpcEvent } from "@type";

export const ipcRenderer = new IpcRendererWrapper<IpcEvent>();

export type IpcRenderer = typeof ipcRenderer;
