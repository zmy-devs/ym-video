import { contextBridge, shell } from "electron";
import { ipcRenderer } from "../main/ipc/ipcRenderer";

const api = {
  //打开网页
  openUrl(url: string) {
    shell.openExternal(url);
  },
};

contextBridge.exposeInMainWorld("api", api);
contextBridge.exposeInMainWorld("ipcRenderer", {
  send: ipcRenderer.send,
  on: ipcRenderer.on,
  invoke: ipcRenderer.invoke,
});
