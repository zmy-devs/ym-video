import dayjs from "dayjs";
import isToday from "dayjs/plugin/isToday";
import isYesterday from "dayjs/plugin/isYesterday";
import isoWeek from "dayjs/plugin/isoWeek";

dayjs.extend(isToday);
dayjs.extend(isYesterday);
dayjs.extend(isoWeek);

//处理综艺的日期
export const formatRemarks = (remarks: string) => {
  return remarks.replace(/(\d{4})(\d{2})(\d{2})/g, (_, year, month, day) => {
    const date = new Date();

    if (date.getFullYear() == year) {
      return `${month}-${day}`;
    }

    return `${year}-${month}-${day}`;
  });
};

//处理地区语言等副标题
export const formatSub = (content: string) => {
  if (!content || content == "0") {
    return "未知";
  }

  const arr = content.split(",");

  return arr[0];
};

//补0
const pad = (num: number) => {
  return num.toString().padStart(2, "0");
};

//格式化秒
export const formatSeconde = (seconde: number) => {
  seconde ||= 0;

  if (seconde < 0) {
    return "00:00";
  }

  const h = Math.floor(seconde / 3600);
  const m = Math.floor((seconde % 3600) / 60);
  const s = Math.floor(seconde % 60);

  if (h == 0) {
    return `${pad(m)}:${pad(s)}`;
  }

  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

//格式化历史记录时间
export const formatDay = (date: number) => {
  const d = dayjs(date);
  const now = dayjs();

  if (d.isToday()) {
    return `今天 ${d.format("HH:mm")}`;
  }

  if (d.isYesterday()) {
    return `昨天 ${d.format("HH:mm")}`;
  }

  if (d.isoWeek() === now.isoWeek() && d.year() === now.year()) {
    const weekMap = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
    return `${weekMap[d.isoWeekday() - 1]} ${d.format("HH:mm")}`;
  }

  if (d.year() == now.year()) {
    return d.format("MM-DD HH:mm");
  }

  return d.format("YYYY-MM-DD HH:mm");
};

//格式化简介
export const formatContent = (content: string = "") => {
  return content
    .replace(/<\/?.+?>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\u00A0/g, " ")
    .replace(/\r?\n+/g, "\n")
    .replace(/[　]+/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
};
