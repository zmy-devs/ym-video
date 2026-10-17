import dayjs from "dayjs";

interface GroupItem<T> {
  title: string;
  data: T[];
}

//分组历史记录时间
export const groupByTime = <T>(data: Map<string, T>, cb: (item: T) => any) => {
  const now = dayjs();

  // 初始化分组
  const groups: GroupItem<T>[] = [
    { title: "今天", data: [] },
    { title: "昨天", data: [] },
    { title: "本周", data: [] },
    { title: "更早", data: [] },
  ];

  data.forEach(item => {
    const d = dayjs(cb(item));

    const index = d.isToday()
      ? 0
      : d.isYesterday()
      ? 1
      : d.isoWeek() === now.isoWeek() && d.year() === now.year()
      ? 2
      : 3;

    groups[index].data.push(item);
  });

  for (const group of groups) {
    group.data.sort((a, b) => cb(b) - cb(a));
  }

  return groups;
};
