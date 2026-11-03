import { clearMocks, mockIPC, mockWindows } from '@tauri-apps/api/mocks';

// 浏览器回归使用官方 Tauri mock，并保留实际业务组件与网络替身。
export const mockDesktop = (
  options: {
    resource?: (url: string) => Promise<unknown>;
    theme?: (theme: 'light' | 'dark' | null) => void;
  } = {},
) => {
  // 测试开始前的运行环境属性。
  const original = Object.getOwnPropertyDescriptor(window, 'isTauri');

  // 模拟 API 请求使用的取消控制器。
  const controllers = new Map<string, AbortController>();

  Object.defineProperty(window, 'isTauri', { configurable: true, value: true });

  mockWindows('main');

  mockIPC(
    async (command, args) => {
      // 通过 Tauri mock 收到的命令参数。
      const payload =
        args &&
        !Array.isArray(args) &&
        !(args instanceof ArrayBuffer) &&
        !ArrayBuffer.isView(args)
          ? args
          : {};

      if (command === 'plugin:app|version') {
        return '6.1.6';
      }

      if (command === 'plugin:window|is_maximized') {
        return false;
      }

      if (command === 'plugin:window|set_theme') {
        // null 表示将窗口主题交还系统，明暗字符串表示固定外观。
        const theme = payload.value;

        if (theme === null || theme === 'light' || theme === 'dark') {
          options.theme?.(theme);
        }
      }

      if (command === 'plugin:updater|check') {
        return null;
      }

      if (command === 'request_resource') {
        if (!options.resource) {
          throw new Error('测试未配置资源接口');
        }

        return options.resource(String(payload.url));
      }

      if (command === 'cancel_request') {
        controllers.get(String(payload.id))?.abort();
      }

      if (command === 'request_api') {
        // 测试桥接收到的 API 请求内容。
        const input = payload.request;

        if (
          typeof input !== 'object' ||
          input === null ||
          !('path' in input) ||
          !('method' in input)
        ) {
          throw new Error('测试 API 请求无效');
        }

        // 用于模拟网络请求取消的控制器。
        const controller = new AbortController();

        // 请求与取消操作共用的追踪标识。
        const id = String(payload.id);

        controllers.set(id, controller);

        try {
          // 本次网络请求返回的响应。
          const response = await window.fetch(String(input.path), {
            method: String(input.method),
            body: 'body' in input ? (input.body as string | null) : null,
            headers: { 'content-type': 'application/json' },
            signal: controller.signal,
          });

          return {
            status: response.status,
            body: await response.text(),
            contentType: 'application/json',
          };
        } finally {
          controllers.delete(id);
        }
      }

      return null;
    },
    { shouldMockEvents: true },
  );

  return () => {
    clearMocks();

    if (original) {
      Object.defineProperty(window, 'isTauri', original);
    } else {
      Reflect.deleteProperty(window, 'isTauri');
    }
  };
};
