//格式化版本
export const formatVersion = (version: string) => {
  const [major, minor, patch] = version.split(".").map(Number);

  return major * 10000 + minor * 100 + patch;
};
