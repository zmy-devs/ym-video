import storage from "@/services/storage";
import type { Key } from "@/services/storage";
import debounce from "@/utils/debounce";
import { proxy, subscribe } from "valtio";

export default <T extends object>(defaultValue: T, key: Key) => {
  let value: T;

  const stored = storage.getItem(key);

  const saveData = debounce(value => {
    storage.setItem(key, JSON.stringify(value));
  }, 300);

  if (stored !== undefined) {
    try {
      value = Object.assign(defaultValue, JSON.parse(stored));
    } catch {
      value = defaultValue;
    }
  } else {
    value = defaultValue;
  }

  const res = proxy<T>(value);

  //自动保存配置
  subscribe(res, () => {
    saveData(res);
  });

  return res;
};
