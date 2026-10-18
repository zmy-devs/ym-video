import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getCategorySelection } from '../src/lib/category.ts';
import type { Category } from '../src/types.ts';

// 覆盖带子分类和没有子分类的两种上游结构。
const categories: Category[] = [
  { id: 2, parentId: 0, name: '连续剧' },
  { id: 13, parentId: 2, name: '国产剧' },
  { id: 14, parentId: 2, name: '港台剧' },
  { id: 3, parentId: 0, name: '综艺' },
];

test('进入大分类时请求首个真实子类，不合成全部分类', () => {
  // 页面标题、Tabs 与请求使用同一份分类映射。
  const selection = getCategorySelection(categories, 2);

  assert.equal(selection.parent?.name, '连续剧');
  assert.deepEqual(
    selection.children.map((item) => item.id),
    [13, 14],
  );
  assert.equal(selection.selectedId, 13);
});

test('切换或直接访问子类时保留大类标题，并请求对应子类', () => {
  // 直接打开子类链接也应恢复正确的标题与选中项。
  const selection = getCategorySelection(categories, 14);

  assert.equal(selection.parent?.id, 2);
  assert.equal(selection.parent?.name, '连续剧');
  assert.equal(selection.selectedId, 14);
});

test('无子分类的大类直接请求自身，不显示空 Tabs', () => {
  // 只有一级分类的资源源无需额外映射。
  const selection = getCategorySelection(categories, 3);

  assert.equal(selection.parent?.name, '综艺');
  assert.deepEqual(selection.children, []);
  assert.equal(selection.selectedId, 3);
});

test('分类未加载时不请求影片，切源后的失效分类回退到首个大类', () => {
  assert.equal(getCategorySelection([], 14).selectedId, 0);
  assert.equal(getCategorySelection(categories, 999).parent?.id, 2);
  assert.equal(getCategorySelection(categories, 999).selectedId, 13);
});
