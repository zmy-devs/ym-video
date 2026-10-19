import { errorToast } from '../utils/toast.ts';

// 当前 Web 偏好的统一存储前缀。
const storagePrefix = 'ym-video:';

// 同类存储失败只提示一次，仍允许当前页面在内存中工作。
const reported = new Set<string>();

// 通知用户持久化失败，不将内存操作误报为已保存。
export const storageError = (kind: string) => {
  if (reported.has(kind)) {
    return;
  }
  reported.add(kind);
  errorToast(`${kind}保存不可用`, {
    description: '当前操作仅在本次页面中生效，请检查浏览器存储权限或可用空间。',
  });
};

// 本地偏好读取失败时回退默认值。
export const readLocal = <T>(
  key: string,
  fallback: T,
  validate: (value: unknown) => value is T,
): T => {
  try {
    // 浏览器存储中的原始字符串。
    const raw = localStorage.getItem(`${storagePrefix}${key}`);
    if (raw === null) {
      return fallback;
    }
    // 本次操作读取的数据。
    const value: unknown = JSON.parse(raw);
    if (!validate(value)) {
      return fallback;
    }
    return value;
  } catch {
    storageError('浏览器设置');
    return fallback;
  }
};

// 本地偏好写入失败不阻断浏览和播放。
export const writeLocal = (key: string, value: unknown) => {
  try {
    localStorage.setItem(`${storagePrefix}${key}`, JSON.stringify(value));
  } catch {
    storageError('浏览器设置');
    return false;
  }
  return true;
};
