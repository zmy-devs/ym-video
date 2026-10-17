import { Paths, File } from "expo-file-system";
import { DependencyList, useEffect, useState } from "react";

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

//文本存储本地
const textToUrl = async (text: string) => {
  const file = new File(Paths.cache, "cache.m3u8");

  file.write(text, { encoding: "utf8" });

  return `${file.uri}?t=${Date.now()}`;
};

//获取播放源
const getSource = async (url: string) => {
  const response = await fetch(url);

  const text = await response.text();

  const filteredText = filterAd(text);

  const m3u8Text = resolveTSUrls(filteredText, url);

  return textToUrl(m3u8Text);
};

export default function (url: string, dep: DependencyList) {
  const [uri, setUri] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!url) return;
    let canceled = false;

    (async () => {
      const data = await getSource(url);

      if (!canceled) setUri(data);
    })();

    return () => {
      canceled = true;
    };
  }, dep);

  return { uri };
}
