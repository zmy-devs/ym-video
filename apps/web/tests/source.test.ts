import {
  sourceFormSchema,
  customSourcesSchema,
} from '../src/schemas/source.ts';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCategories } from '../src/lib/source.ts';

// 上游可能使用数字或数字字符串表示分类 ID。
const valid = {
  class: [
    { type_id: '1', type_pid: '0', type_name: ' 电影 ' },
    { type_id: 2, type_pid: 1, type_name: '动作片' },
  ],
};

test('分类同时支持整数和数字字符串，并保留父子关系', () => {
  assert.deepEqual(parseCategories(valid), [
    { id: 1, parentId: 0, name: '电影' },
    { id: 2, parentId: 1, name: '动作片' },
  ]);
});

test('不接受空分类、错误字段、重复 ID 或无法展示的分类层级', () => {
  // 以下响应都不能成为可用播放源。
  const invalid: unknown[] = [
    null,
    {},
    { class: [] },
    { class: [null] },
    { class: [{ type_id: null, type_pid: 0, type_name: '电影' }] },
    { class: [{ type_id: '', type_pid: 0, type_name: '电影' }] },
    { class: [{ type_id: true, type_pid: 0, type_name: '电影' }] },
    { class: [{ type_id: 0, type_pid: 0, type_name: '电影' }] },
    { class: [{ type_id: 1.5, type_pid: 0, type_name: '电影' }] },
    { class: [{ type_id: 1, type_pid: 0, type_name: ' ' }] },
    { class: [{ type_id: 1, type_name: '电影' }] },
    { class: [valid.class[0], valid.class[0]] },
    { class: [{ type_id: 1, type_pid: 1, type_name: '循环分类' }] },
    {
      class: [
        valid.class[0],
        { type_id: 2, type_pid: 3, type_name: '缺少父分类' },
      ],
    },
    {
      class: [
        ...valid.class,
        { type_id: 3, type_pid: 2, type_name: '不支持的三级分类' },
      ],
    },
  ];

  invalid.forEach((body) => assert.throws(() => parseCategories(body)));
});

test('接口规范化去掉旧筛选和片段，保留接口需要的参数', () => {
  assert.equal(
    sourceFormSchema.shape.url.parse(
      ' https://EXAMPLE.com:443/api?token=abc&ac=detail&pg=2&t=1&wd=test&ids=3#top ',
    ),
    'https://example.com/api?token=abc',
  );

  [
    'example.com',
    'javascript:alert(1)',
    'file:///api',
    'https://user:pass@example.com',
    'https://example.com/' + '中'.repeat(300),
  ].forEach((url) =>
    assert.throws(() => sourceFormSchema.shape.url.parse(url)),
  );
});

test('本地源只恢复合法的自定义记录，拒绝重复和损坏数据', () => {
  // 平台 ID 不得通过本地记录冒充自定义源。
  const source = {
    id: 'custom:test',
    name: '测试源',
    url: 'https://example.com/api',
  };

  assert.equal(customSourcesSchema.safeParse([source]).success, true);
  assert.equal(customSourcesSchema.safeParse([]).success, true);
  assert.equal(
    customSourcesSchema.safeParse([{ ...source, id: 'baofeng' }]).success,
    false,
  );
  assert.equal(
    customSourcesSchema.safeParse([{ ...source, name: ' ' }]).success,
    false,
  );
  assert.equal(
    customSourcesSchema.safeParse([{ ...source, url: 'file:///api' }]).success,
    false,
  );
  assert.equal(customSourcesSchema.safeParse([source, source]).success, false);
  assert.equal(
    customSourcesSchema.safeParse([source, { ...source, id: 'custom:other' }])
      .success,
    false,
  );
  assert.equal(
    customSourcesSchema.safeParse({ sources: [source] }).success,
    false,
  );
});
