// 定义事件到函数类型的映射
type EventMap = {
  'player-episodes:show': [];
};

type EventName = keyof EventMap;
type EventHandler<T extends EventName> = (...args: EventMap[T]) => void;

class EventBus {
  // 事件监听器集合
  private listeners: { [T in EventName]?: Set<EventHandler<T>> } = {};

  // 监听事件
  on<T extends EventName>(eventName: T, handler: EventHandler<T>) {
    const handlers = this.listeners[eventName] ?? new Set<EventHandler<T>>();

    handlers.add(handler);
    this.listeners[eventName] = handlers;

    return () => {
      handlers.delete(handler);

      if (handlers.size === 0) {
        delete this.listeners[eventName];
      }
    };
  }

  // 触发事件
  emit<T extends EventName>(eventName: T, ...args: EventMap[T]) {
    this.listeners[eventName]?.forEach((handler) => {
      handler(...args);
    });
  }
}

// 全局事件总线
export const eventBus = new EventBus();
