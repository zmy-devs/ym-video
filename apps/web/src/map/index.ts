// 更新状态对应的页面文案。
export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'downloading'
  | 'downloaded'
  | 'installing'
  | 'error';

export type UpdateErrorType = 'network' | 'check' | 'install';

export const UPDATE_STATUS_MESSAGE_MAP: Record<UpdateStatus, string> = {
  idle: '',
  checking: '正在检查更新…',
  'up-to-date': '当前已是最新版本',
  downloading: '正在下载 v{version}，{progress}%',
  downloaded: 'v{version} 已下载完成',
  installing: '正在安装更新…',
  error: '更新失败，请重试',
};

export const UPDATE_ERROR_MESSAGE_MAP: Record<UpdateErrorType, string> = {
  network: '更新失败，网络连接异常',
  check: '更新失败，请重试',
  install: '安装失败，请重试',
};

// 观看历史的同步状态。
export type HistoryStatus = 'synced' | 'pending' | 'error';

// 历史同步错误集中映射为用户提示。
import type { HistoryErrorType } from '@ym-video/history';
export type { HistoryErrorType } from '@ym-video/history';

export const HISTORY_ERROR_MESSAGE_MAP: Record<HistoryErrorType, string> = {
  offline: '网络已断开，显示此设备缓存',
  network: '网络连接失败，请检查网络后重试',
  timeout: '请求超时，请重试',
  unauthorized: '登录状态已失效，请重新登录',
  server: '服务暂时不可用，请稍后重试',
  request: '观看历史同步失败，请重试',
  storage: '本机观看历史无法读取或保存',
  'invalid-entry': '影片信息不完整，观看历史未保存',
  'oversized-entry': '影片信息过大，观看历史未保存',
  'invalid-response': '云端观看历史格式错误',
  unknown: '观看历史同步失败，请重试',
};
