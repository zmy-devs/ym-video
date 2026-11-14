import type { UpdateStatus } from '@/types/update';

// 更新阶段对应的页面文案。
export const UPDATE_STATUS_MESSAGE_MAP: Record<UpdateStatus, string> = {
  idle: '',
  checking: '正在检查更新…',
  downloading: '正在下载 v{version}，{progress}%',
  downloaded: 'v{version} 已下载完成',
  installing: '正在安装更新…',
  'installer-opened': '已打开系统安装器，请确认安装；返回后可再次安装',
};
