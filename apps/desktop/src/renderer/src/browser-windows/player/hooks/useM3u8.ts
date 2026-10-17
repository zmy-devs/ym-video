// 去广告 m3u8 解析
const filterAd = (m3u8Content: string) => {
  if (!m3u8Content) return "";

  const cleaned = m3u8Content.replace(/#EXTINF:.*?\r?\n.*?adjump.*?\r?\n/g, "");

  // 去掉多余的空行
  return cleaned.replace(/^\s*[\r\n]/gm, "");
};

// 解析 m3u8，转换为绝对路径
const resolveTSUrls = (m3u8Text: string, m3u8Url: string) => {
  const lines = m3u8Text.split("\n");
  const baseUrl = m3u8Url.substring(0, m3u8Url.lastIndexOf("/") + 1);

  const resolved = lines.map(line => {
    // 忽略注释行
    if (line.startsWith("#") || line.startsWith("http")) {
      return line;
    }

    // 相对路径 ts 文件
    return baseUrl + line;
  });

  return resolved.join("\n");
};

//获取播放源
export const getSource = async (url: string) => {
  const response = await fetch(url);

  const text = await response.text();

  const filteredText = filterAd(text);

  const m3u8Text = resolveTSUrls(filteredText, url);

  const blob = new Blob([m3u8Text], {
    type: "application/vnd.apple.mpegurl",
  });

  return URL.createObjectURL(blob);
};
