import { HistoryInfo } from "@/type";

// 定义事件到函数类型的映射
type EventMap = {
  "player:rate:show": () => void;

  "player:list:show": () => void;

  "player:volume:show": () => void;

  "player:brightness:show": () => void;

  "openPlayer": (data: HistoryInfo) => void;

  "saveHistory": (data: HistoryInfo) => void;
};

type EventNames = keyof EventMap;

class EventEmitter {
  private listeners = {} as Record<EventNames, Set<Function>>;

  on<T extends EventNames>(eventName: T, listener: EventMap[T]) {
    if (!(eventName in this.listeners)) {
      this.listeners[eventName] = new Set();
    }

    this.listeners[eventName].add(listener);

    return {
      remove: () => {
        this.listeners[eventName].delete(listener);
      },
    };
  }

  off<T extends EventNames>(eventName: T, listener: EventMap[T]) {
    if (!(eventName in this.listeners)) {
      return;
    }

    this.listeners[eventName].delete(listener);
  }

  emit<T extends EventNames>(eventName: T, ...args: Parameters<EventMap[T]>) {
    if (!(eventName in this.listeners)) {
      return;
    }

    this.listeners[eventName].forEach(listener => listener(...args));
  }
}

export default new EventEmitter();
