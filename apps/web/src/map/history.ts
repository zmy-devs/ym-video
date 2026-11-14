import type { HistoryErrorType } from '@ym-video/history';

// 观看历史的同步状态。
export type HistoryStatus = 'synced' | 'pending' | 'error';

// 历史同步错误集中映射为用户提示。
export type { HistoryErrorType } from '@ym-video/history';

export const HISTORY_ERROR_MESSAGE_MAP: Record<HistoryErrorType, string> = {
  offline: '网络已断开，显示此设备缓存',
  network: '网络连接失败，请检查网络后重试',
  timeout: '请求超时，请重试',
  unauthorized: '登录状态已失效，请重新登录',
  server: '服务暂时不可用，请稍后重试',
  request: '观看历史同步失败，请重试',
  storage: '本机观看历史无法读取或保存',
  'oversized-entry': '影片信息过大，观看历史未保存',
  'invalid-response': '云端观看历史格式错误',
  unknown: '观看历史同步失败，请重试',
};
