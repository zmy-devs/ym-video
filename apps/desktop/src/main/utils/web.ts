import type { IpcMainInvokeEvent } from 'electron';

export const webUrl = new URL(__YM_VIDEO_WEB_URL__);

export const isTrustedUrl = (value: string) => {
  try {
    return new URL(value).origin === webUrl.origin;
  } catch {
    return false;
  }
};

export const assertTrustedFrame = (event: IpcMainInvokeEvent) => {
  const senderFrame = event.senderFrame;
  if (!senderFrame || senderFrame !== event.sender.mainFrame) {
    throw new Error('拒绝来自非应用页面的桌面请求');
  }

  if (!isTrustedUrl(senderFrame.url)) {
    throw new Error('拒绝来自非应用页面的桌面请求');
  }
};
