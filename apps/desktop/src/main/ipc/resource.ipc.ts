import { app, type IpcMainInvokeEvent } from 'electron';
import { webUrl } from '../utils/web';

// 代理只允许应用自身的主框架调用。
const assertTrustedSender = ({ sender, senderFrame }: IpcMainInvokeEvent) => {
  // 开发来源与创建窗口时保持一致，生产固定使用内置页面的 HTTPS 来源。
  const pageUrl = app.isPackaged
    ? webUrl
    : new URL(process.env.ELECTRON_RENDERER_URL ?? 'http://localhost:3000');

  if (
    !senderFrame ||
    senderFrame !== sender.mainFrame ||
    new URL(senderFrame.url).origin !== pageUrl.origin
  ) {
    throw new Error('不允许此页面使用本地资源代理');
  }
};

// 校验完整 URL 后由 Node fetch 直连资源源。
export const requestResource = async (
  event: IpcMainInvokeEvent,
  address: string,
): Promise<unknown> => {
  assertTrustedSender(event);

  if (typeof address !== 'string' || address.length > 8192) {
    throw new Error('资源接口地址无效');
  }

  // 不允许非网络协议或 URL 中内嵌凭证。
  let url: URL;

  try {
    url = new URL(address);
  } catch {
    throw new Error('请输入有效的 HTTP 或 HTTPS 接口地址');
  }

  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new Error('请输入有效的 HTTP 或 HTTPS 接口地址');
  }

  // 只请求 JSON，不转发渲染进程的 Cookie 或自定义请求头。
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    redirect: 'manual',
    signal: AbortSignal.timeout(10_000),
  });

  if (response.status >= 300 && response.status < 400) {
    throw new Error('资源接口发生未经允许的重定向');
  }

  if (!response.ok) {
    throw new Error(`接口请求失败（${response.status}）`);
  }

  return response.json();
};
