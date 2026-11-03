import type { HistoryEntry } from '@ym-video/history';

// 按本地日期互斥归类，保留传入的观看时间顺序。
export const groupHistory = (
  entries: readonly HistoryEntry[],
  now = new Date(),
) => {
  // 今日从本地零点开始，本周从周一开始。
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const week = new Date(today);

  week.setDate(today.getDate() - ((today.getDay() + 6) % 7));

  // 最近一年但早于今年的记录保留在更早分组。
  const oneYearAgo = new Date(
    now.getFullYear() - 1,
    now.getMonth(),
    now.getDate(),
  );

  // 从近到远匹配，每条记录只归入第一个满足条件的分组。
  const groups: { label: string; start: number; entries: HistoryEntry[] }[] = [
    { label: '今日', start: today.getTime(), entries: [] },
    { label: '本周', start: week.getTime(), entries: [] },
    {
      label: '本月',
      start: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
      entries: [],
    },
    {
      label: '今年',
      start: new Date(now.getFullYear(), 0, 1).getTime(),
      entries: [],
    },
    { label: '更早', start: oneYearAgo.getTime(), entries: [] },
    { label: '很久之前', start: -Infinity, entries: [] },
  ];

  for (const entry of entries) {
    groups.find((group) => entry.watchedAt >= group.start)?.entries.push(entry);
  }

  return groups.filter((group) => group.entries.length > 0);
};
