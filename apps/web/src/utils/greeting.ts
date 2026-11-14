// 根据观众当前的本地时间生成问候。
export const getGreeting = (date = new Date()) => {
  const hour = date.getHours();
  if (hour < 5 || hour >= 18) {
    return '晚上好';
  }
  if (hour < 11) {
    return '早上好';
  }
  if (hour < 14) {
    return '中午好';
  }
  return '下午好';
};
