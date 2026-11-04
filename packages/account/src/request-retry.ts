// 请求失败后按调用方指定的次数重试，支持持续重试到成功或取消。
const waitForRetry = (signal: AbortSignal, delay: number) =>
  new Promise<void>((resolve, reject) => {
    // 请求失败到等待开始之间也可能已被取消。
    signal.throwIfAborted();

    // 等待结束后移除取消监听，避免成功请求遗留订阅。
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', handleAbort);
      resolve();
    }, delay);

    // 取消等待时同时释放计时器。
    const handleAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };

    signal.addEventListener('abort', handleAbort, { once: true });
  });

// IPC 本身无法取消，返回时仍需拦截已失效的结果。
export const retryRequest = async <T>(
  request: () => Promise<T>,
  signal: AbortSignal,
  retries = 5,
) => {
  for (let attempt = 0; ; attempt += 1) {
    signal.throwIfAborted();

    try {
      const result = await request();

      signal.throwIfAborted();
      return result;
    } catch (cause) {
      if (signal.aborted || attempt >= retries) {
        throw cause;
      }

      // 连续失败时逐步延长间隔，最多等待五秒再发起下一次请求。
      await waitForRetry(signal, Math.min(attempt + 1, 5) * 1000);
    }
  }
};
