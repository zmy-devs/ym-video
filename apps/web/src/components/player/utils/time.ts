// 将当前值换算为 0～100 的百分比，未取得总量时显示零。
export const getProgress = (current: number, total: number) => {
  if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, (current / total) * 100));
};

// 格式化播放器中的时长。
export const formatTime = (seconds: number) => {
  // 用于显示的非负整数秒数。
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;

  // 按时、分、秒顺序组织的时间。
  const parts = [Math.floor(total / 60), total % 60];
  if (total >= 3600) {
    parts.splice(0, 1, Math.floor(total / 3600), Math.floor(total / 60) % 60);
  }
  return parts.map((part) => String(part).padStart(2, '0')).join(':');
};
