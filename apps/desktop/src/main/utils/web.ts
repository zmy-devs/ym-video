// 开发连接本地 Web，生产使用固定的 HTTPS 站点。
export const webUrl = new URL(
  import.meta.env.DEV
    ? 'http://localhost:5173'
    : 'https://ym-video.zhangmingyang.dpdns.org',
);

export const isTrustedUrl = (value: string) => {
  try {
    return new URL(value).origin === webUrl.origin;
  } catch {
    return false;
  }
};
