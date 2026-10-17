import { contextBridge } from "electron";
import { ipcRenderer } from "../main/ipc/ipcRenderer";

contextBridge.exposeInMainWorld("ipcRenderer", {
  send: ipcRenderer.send,
  on: ipcRenderer.on,
  invoke: ipcRenderer.invoke,
});
