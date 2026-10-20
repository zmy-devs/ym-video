import type * as IpcInput0 from '../main/ipc/index.js';
import type * as IpcInput1 from '../main/ipc/update.ipc.js';

declare module 'plugin-electron-ipc' {
  // 当前项目提供的 IPC 输入模块
  interface ElectronIpcHandlerModules {
    readonly input0: typeof IpcInput0;
    readonly input1: typeof IpcInput1;
  }
}

export {};
