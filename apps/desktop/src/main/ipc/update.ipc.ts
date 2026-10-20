import type { IpcMainInvokeEvent } from 'electron';
import { assertTrustedFrame } from '@/utils/web';
import { updateService, type UpdateCheckResult } from '@/utils/update';

export const checkForUpdates = async (
  event: IpcMainInvokeEvent,
): Promise<UpdateCheckResult> => {
  assertTrustedFrame(event);
  return updateService.checkForUpdates();
};

export const installUpdate = (event: IpcMainInvokeEvent) => {
  assertTrustedFrame(event);
  updateService.install();
};
