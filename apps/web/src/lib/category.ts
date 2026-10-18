import type { Category } from '../types.ts';

// 与桌面端一致，只展示真实子分类；进入大类时默认请求首个子类。
export const getCategorySelection = (
  categories: readonly Category[],
  categoryId: number,
) => {
  // 切换资源源后，旧分类不存在时回退到首个大类。
  const current =
    categories.find((item) => item.id === categoryId) ??
    categories.find((item) => item.parentId === 0);

  if (!current) {
    return { parent: undefined, children: [], selectedId: 0 };
  }

  // 标题和侧栏始终使用所属大类，不随子分类切换。
  const parent =
    categories.find((item) => item.id === (current.parentId || current.id)) ??
    current;

  // 保留上游分类顺序，不添加没有实际数据的“全部”。
  const children = categories.filter((item) => item.parentId === parent.id);

  // 没有子类时直接请求大类自身。
  const selectedId =
    current.parentId === parent.id
      ? current.id
      : (children[0]?.id ?? parent.id);

  return { parent, children, selectedId };
};
