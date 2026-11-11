import { useStorage } from '@vueuse/core';
import { storageError } from '@ym-video/ui/lib/toast';

// 桌面搜索入口与移动搜索页共用当前设备的最近搜索记录。
export const useSearchHistory = () => {
  // 存储边界只接受字符串列表。
  const recent = useStorage<string[]>('ym-video:searches', [], undefined, {
    onError: () => storageError('本地设置'),
    serializer: {
      read: (raw) => {
        const value: unknown = JSON.parse(raw);

        return Array.isArray(value) &&
          value.every((item) => typeof item === 'string')
          ? value
          : [];
      },
      write: JSON.stringify,
    },
  });

  // 新提交的关键词排在最前，最多保留二十条唯一记录。
  const remember = (keyword: string) => {
    recent.value = [
      keyword,
      ...recent.value.filter((item) => item !== keyword),
    ].slice(0, 20);
  };

  // 删除指定关键词。
  const remove = (keyword: string) => {
    recent.value = recent.value.filter((item) => item !== keyword);
  };

  // 确认后清空当前设备的搜索记录。
  const clear = () => {
    recent.value = [];
  };

  return { recent, remember, remove, clear };
};
