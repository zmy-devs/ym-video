import { authClient } from './auth';
import { isRecord } from './api';

// 后台列表只使用账号安全字段，不包含密码和会话信息。
export interface AdminUser {
  id: string;
  name: string;
  username: string | null;
  email: string;
  role: string;
  banned: boolean;
}

// 邀请链接由当前 Web 来源和 token 组合，兼容开发代理。
export interface Invitation {
  id: string;
  name: string;
  token: string;
  createdAt: number;
  usedAt: number | null;
}

// 两类管理列表使用同一分页契约。
export interface AdminPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// 保留接口错误码，让表单把校验错误显示在对应字段的位置。
export class AccountRequestError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
  }
}

// 所有后台和邀请操作复用 Cookie，请求失败保留服务端反馈。
export const accountRequest = async (
  path: string,
  options: RequestInit = {},
): Promise<unknown> => {
  const response = await fetch(`/api/v1${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      authClient.$store.notify('$sessionSignal');
    }
    throw new AccountRequestError(
      isRecord(body) && typeof body.message === 'string'
        ? body.message
        : '请求失败，请重试',
      isRecord(body) && typeof body.code === 'string'
        ? body.code
        : 'REQUEST_FAILED',
    );
  }
  return body;
};

// 接口边界检查账号字段，避免未知数据直接进入表格。
const isAdminUser = (value: unknown): value is AdminUser =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.name === 'string' &&
  (value.username === null || typeof value.username === 'string') &&
  typeof value.email === 'string' &&
  typeof value.role === 'string' &&
  typeof value.banned === 'boolean';

// 邀请使用时间必须显式为数字或 null。
const isInvitation = (value: unknown): value is Invitation =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.name === 'string' &&
  typeof value.token === 'string' &&
  typeof value.createdAt === 'number' &&
  (value.usedAt === null || typeof value.usedAt === 'number');

// 分页响应同时校验元数据与每条记录。
const getPage = async <T>(
  path: string,
  page: number,
  search: string,
  signal: AbortSignal,
  validate: (value: unknown) => value is T,
): Promise<AdminPage<T>> => {
  const query = new URLSearchParams({ page: String(page), search });
  const body = await accountRequest(`${path}?${query}`, { signal });
  if (
    !isRecord(body) ||
    !Array.isArray(body.items) ||
    !body.items.every(validate) ||
    typeof body.total !== 'number' ||
    typeof body.page !== 'number' ||
    typeof body.pageSize !== 'number'
  ) {
    throw new Error('列表数据格式不正确，请重试');
  }
  return {
    items: body.items,
    total: body.total,
    page: body.page,
    pageSize: body.pageSize,
  };
};

// 账号和邀请在服务端执行搜索与分页。
export const getAdminUsers = (
  page: number,
  search: string,
  signal: AbortSignal,
) => getPage('/admin/users', page, search, signal, isAdminUser);
export const getInvitations = (
  page: number,
  search: string,
  signal: AbortSignal,
) => getPage('/admin/invitations', page, search, signal, isInvitation);

// 新建邀请成功后即持久保存，关闭弹窗不会回收。
export const createInvitation = async (name: string, signal?: AbortSignal) => {
  const body = await accountRequest('/admin/invitations', {
    method: 'POST',
    body: JSON.stringify({ name }),
    signal,
  });
  if (!isRecord(body) || !isInvitation(body.invitation)) {
    throw new Error('邀请链接数据格式不正确');
  }
  return body.invitation;
};

// 当前访问域名生成可直接分享的邀请链接。
export const invitationUrl = (token: string) =>
  `${window.location.origin}/invite/${encodeURIComponent(token)}`;
