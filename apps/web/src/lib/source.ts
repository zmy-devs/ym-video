import type { Category, CustomSource } from '../types.ts';

// 在用户输入边界规范化资源接口地址。
export const normalizeSourceUrl = (value: string) => {
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
  ['ac', 'pg', 't', 'ids', 'wd'].forEach((key) => url.searchParams.delete(key));

  return url.href;
};

// 本机存储中的自定义源列表在读取时校验。
export const isCustomSourceList = (value: unknown): value is CustomSource[] => {
  if (!Array.isArray(value)) {
    return false;
  }

  const ids = new Set<string>();
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

// 解析采集站分类，保留原始父子关系。
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

  const isId = (value: unknown) =>
    (typeof value === 'number' ||
      (typeof value === 'string' && /^\d+$/.test(value))) &&
    Number.isSafeInteger(Number(value)) &&
    Number(value) >= 0;
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
