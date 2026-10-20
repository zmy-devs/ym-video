import { updateService, type UpdateCheckResult } from '@/utils/update';

export const checkForUpdates = async (): Promise<UpdateCheckResult> => {
  return updateService.checkForUpdates();
};

export const installUpdate = () => {
  updateService.install();
};

