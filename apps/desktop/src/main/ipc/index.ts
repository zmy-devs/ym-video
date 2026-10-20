import { app, type IpcMainInvokeEvent } from 'electron';
import { assertTrustedFrame } from '@/utils/web';

export const getVersion = (event: IpcMainInvokeEvent) => {
  assertTrustedFrame(event);
  return app.getVersion();
};
