// 泛型映射保持事件名称与参数的对应关系。
export class EventBus<Events extends { [T in keyof Events]: unknown[] }> {
  // 事件监听器集合
  private listeners: {
    [T in keyof Events]?: Set<(...args: Events[T]) => void>;
  } = {};

  // 监听事件
  on<T extends keyof Events>(
    eventName: T,
    handler: (...args: Events[T]) => void,
  ) {
    const handlers =
      this.listeners[eventName] ?? new Set<(...args: Events[T]) => void>();

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
  emit<T extends keyof Events>(eventName: T, ...args: Events[T]) {
    this.listeners[eventName]?.forEach((handler) => {
      handler(...args);
    });
  }
}
