export const webUrl = new URL(__YM_VIDEO_WEB_URL__);

export const isTrustedUrl = (value: string) => {
  try {
    return new URL(value).origin === webUrl.origin;
  } catch {
    return false;
  }
};

