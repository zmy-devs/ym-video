// 更新状态对应的页面文案。
export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'downloading'
  | 'downloaded'
  | 'installing'
  | 'installer-opened'
  | 'error';

export type UpdateErrorType = 'check' | 'download' | 'install' | 'permission';

export const UPDATE_STATUS_MESSAGE_MAP: Record<UpdateStatus, string> = {
  idle: '',
  checking: '正在检查更新…',
  'up-to-date': '当前已是最新版本',
  downloading: '正在下载 v{version}，{progress}%',
  downloaded: 'v{version} 已下载完成',
  installing: '正在安装更新…',
  'installer-opened': '已打开系统安装器，请确认安装；返回后可再次安装',
  error: '更新失败，请重试',
};

export const UPDATE_ERROR_MESSAGE_MAP: Record<UpdateErrorType, string> = {
  check: '检查更新失败，请检查网络后重试',
  download: '下载或校验失败，请重试',
  install: '安装失败，可以重试安装',
  permission: '请允许安装未知应用，然后重试安装',
};
