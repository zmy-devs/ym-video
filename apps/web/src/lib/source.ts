import type { Category, CustomSource } from '../types.ts';

// 统一接口地址，拒绝非 HTTP 协议和内嵌账号密码。
export const normalizeSourceUrl = (value: string) => {
  // URL 解析失败时与不支持的协议使用相同字段提示。
  let url: URL;

  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('请输入有效的 HTTP 或 HTTPS 接口地址');
  }

  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.href.length > 2048
  ) {
    throw new Error('请输入有效的 HTTP 或 HTTPS 接口地址');
  }

  url.hash = '';

  // 翻页和筛选参数由实际查询设置，其他接口参数保持原样。
  ['ac', 'pg', 't', 'ids', 'wd'].forEach((key) => url.searchParams.delete(key));

  return url.href;
};

// 本地播放源也需验证，损坏数据不进入请求层。
export const isCustomSourceList = (value: unknown): value is CustomSource[] => {
  if (!Array.isArray(value)) {
    return false;
  }

  // ID 和接口地址不能重复，避免选源结果不确定。
  const ids = new Set<string>();

  // 同一接口不能保存为多个自定义源。
  const urls = new Set<string>();

  return value.every((item: unknown) => {
    if (
      typeof item !== 'object' ||
      item === null ||
      !('id' in item) ||
      typeof item.id !== 'string' ||
      !item.id.startsWith('custom:') ||
      !('name' in item) ||
      typeof item.name !== 'string' ||
      !item.name.trim() ||
      item.name.length > 80 ||
      !('url' in item) ||
      typeof item.url !== 'string'
    ) {
      return false;
    }

    try {
      if (
        normalizeSourceUrl(item.url) !== item.url ||
        ids.has(item.id) ||
        urls.has(item.url)
      ) {
        return false;
      }
    } catch {
      return false;
    }

    ids.add(item.id);
    urls.add(item.url);

    return true;
  });
};

// 严格检查分类字段与层级，避免把空列表或损坏分类误判为可用源。
export const parseCategories = (body: unknown): Category[] => {
  if (
    typeof body !== 'object' ||
    body === null ||
    !('class' in body) ||
    !Array.isArray(body.class) ||
    !body.class.length
  ) {
    throw new Error('接口未返回可用的分类列表');
  }

  // 分类 ID 只接受整数或整数字符串，不将空值转换成零。
  const isId = (value: unknown) =>
    (typeof value === 'number' ||
      (typeof value === 'string' && /^\d+$/.test(value))) &&
    Number.isSafeInteger(Number(value)) &&
    Number(value) >= 0;

  // 同一个分类 ID 只能出现一次。
  const ids = new Set<number>();

  const categories = body.class.map((item: unknown) => {
    if (
      typeof item !== 'object' ||
      item === null ||
      !('type_id' in item) ||
      !isId(item.type_id) ||
      Number(item.type_id) === 0 ||
      !('type_pid' in item) ||
      !isId(item.type_pid) ||
      !('type_name' in item) ||
      typeof item.type_name !== 'string' ||
      !item.type_name.trim() ||
      ids.has(Number(item.type_id))
    ) {
      throw new Error('分类数据格式错误，请检查接口地址');
    }

    ids.add(Number(item.type_id));

    return {
      id: Number(item.type_id),
      parentId: Number(item.type_pid),
      name: item.type_name.trim(),
    };
  });

  // 当前分类界面支持顶层与子分类，父分类必须为可展示的顶层项。
  const parents = new Set(
    categories.filter((item) => item.parentId === 0).map((item) => item.id),
  );

  if (
    !parents.size ||
    categories.some(
      (item) => item.parentId !== 0 && !parents.has(item.parentId),
    )
  ) {
    throw new Error('分类层级不可用，请检查接口地址');
  }

  return categories;
};
