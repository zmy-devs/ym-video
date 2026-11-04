// 将当前值换算为 0～100 的百分比，未取得总量时显示零。
export const getProgress = (current: number, total: number) => {
  if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, (current / total) * 100));
};
