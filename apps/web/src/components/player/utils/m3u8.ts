// 兼容重定向后的清单基址、根路径、相对密钥和子清单。
export const resolveMediaUrl = (reference: string, manifestUrl: string) =>
  new URL(reference.trim(), manifestUrl).href;

// 过滤原有广告分片，并以真实响应地址解析清单中的媒体与 URI 属性。
export const filterManifest = (content: string, manifestUrl: string) => {
  // 移除原有广告分片后的清单文本。
  const filtered = content.replace(
    /#EXTINF:[^\r\n]*\r?\n[^\r\n]*adjump[^\r\n]*(?:\r?\n|$)/g,
    '',
  );
  return filtered
    .split(/\r?\n/)
    .map((line) => {
      if (!line.trim() || line.includes('{$')) {
        return line;
      }
      if (line.startsWith('#')) {
        return line.replace(
          /URI="([^"]+)"/g,
          (_, uri: string) => `URI="${resolveMediaUrl(uri, manifestUrl)}"`,
        );
      }
      return resolveMediaUrl(line, manifestUrl);
    })
    .join('\n');
};
