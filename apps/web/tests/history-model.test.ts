import assert from 'node:assert/strict';
import { test } from 'node:test';
import { groupHistory } from '../src/utils/history.ts';
import {
  applyHistoryOperation,
  emptyHistory,
  isHistoryOperation,
  isHistorySnapshot,
  projectHistory,
} from '../../../packages/history/src/index.ts';
import type {
  HistoryEntry,
  HistoryOperation,
} from '../../../packages/history/src/index.ts';

const createEntry = (episode: number, currentTime: number): HistoryEntry => ({
  id: 'source:movie',
  sourceId: 'source',
  vodId: 'movie',
  name: '测试影片',
  pic: 'https://image.example/poster.jpg',
  year: '',
  area: '',
  lang: '',
  category: '',
  remarks: '',
  episodes: [
    { label: '第 1 集', url: 'https://media.example/1.m3u8' },
    { label: '第 2 集', url: 'https://media.example/2.m3u8' },
  ],
  episode,
  progress: { [String(episode)]: { currentTime, duration: 100 } },
  watchedAt: 0,
});

const createSave = (
  id: string,
  at: number,
  entry: HistoryEntry,
  epoch = 'initial',
  generation = 'initial',
): Extract<HistoryOperation, { type: 'save' }> => ({
  id,
  at,
  epoch,
  type: 'save',
  generation,
  entry: { ...entry, watchedAt: at },
});

test('每集独立按最近真实观看合并，较早离线进度不会覆盖', () => {
  const initial = emptyHistory('user-1');
  const firstEpisode = createSave('op-100', 100, createEntry(0, 20));
  const secondEpisode = createSave('op-200', 200, createEntry(1, 35));
  const newerFirstEpisode = createSave('op-180', 180, createEntry(0, 24));
  const olderOffline = createSave('op-150', 150, createEntry(0, 12));
  const snapshot = projectHistory(initial, [
    firstEpisode,
    secondEpisode,
    newerFirstEpisode,
    olderOffline,
  ]);
  const record = snapshot.records[0];

  assert.equal(record.entry?.episode, 1);
  assert.equal(record.entry?.watchedAt, 200);
  assert.equal(record.entry?.progress['0'].currentTime, 24);
  assert.equal(record.entry?.progress['1'].currentTime, 35);
});

test('删除和清空版本屏障会拒绝旧播放器迟到的保存', () => {
  const initial = emptyHistory('user-1');
  const first = createSave('op-first', 100, createEntry(0, 50));
  const saved = applyHistoryOperation(initial, first);
  const removed: HistoryOperation = {
    id: 'op-remove',
    at: 200,
    epoch: 'initial',
    type: 'remove',
    movieId: 'source:movie',
    generation: 'initial',
  };
  const deleted = applyHistoryOperation(saved, removed);
  const staleSave = createSave('op-stale', 300, createEntry(0, 70));
  assert.equal(applyHistoryOperation(deleted, staleSave), deleted);

  const reopened = createSave(
    'op-reopened',
    400,
    createEntry(0, 5),
    'initial',
    'op-remove',
  );
  const restored = applyHistoryOperation(deleted, reopened);
  assert.equal(restored.records[0].entry?.progress['0'].currentTime, 5);

  const clear: HistoryOperation = {
    id: 'op-clear',
    at: 500,
    epoch: 'initial',
    type: 'clear',
  };
  const cleared = applyHistoryOperation(restored, clear);
  assert.equal(cleared.records.length, 0);
  assert.equal(
    applyHistoryOperation(
      cleared,
      createSave('op-late', 600, createEntry(0, 60)),
    ),
    cleared,
  );
});

test('主动从头播放会把当前集进度更新为零', () => {
  const initial = emptyHistory('user-1');
  const watched = applyHistoryOperation(
    initial,
    createSave('op-watched', 100, createEntry(0, 80)),
  );
  const restarted = applyHistoryOperation(
    watched,
    createSave('op-restarted', 200, createEntry(0, 0)),
  );

  assert.equal(restarted.records[0].entry?.progress['0'].currentTime, 0);
  assert.equal(restarted.records[0].entry?.watchedAt, 200);
});

test('资源缩减集数后清理越界进度，迟到的旧资源快照仍可安全合并', () => {
  const initial = emptyHistory('user-1');
  const watched = applyHistoryOperation(
    initial,
    createSave('old', 100, createEntry(1, 80)),
  );
  const updated = createEntry(0, 20);
  updated.episodes = updated.episodes.slice(0, 1);
  const snapshot = projectHistory(watched, [
    createSave('updated', 200, updated),
    createSave('offline', 150, createEntry(1, 40)),
  ]);
  assert.equal(isHistorySnapshot(snapshot), true);
  assert.equal(snapshot.records[0].entry?.episode, 0);
  assert.deepEqual(Object.keys(snapshot.records[0].entry?.progress ?? {}), [
    '0',
  ]);
});

test('历史操作校验影片标识和进度，并保留媒体协议', () => {
  const valid = createSave('op-valid', 100, createEntry(0, 10));
  assert.equal(isHistoryOperation(valid), true);
  assert.equal(
    isHistoryOperation({
      ...valid,
      entry: { ...valid.entry, id: 'another:movie' },
    }),
    false,
  );
  assert.equal(
    isHistoryOperation({
      ...valid,
      entry: {
        ...valid.entry,
        episodes: [{ label: '本机视频', url: 'file:///videos/episode.mp4' }],
      },
    }),
    true,
  );
});

test('观看历史按本地日期互斥分组，并保持观看时间顺序', () => {
  // 周二覆盖全部日期分组，并区分一年内与超过一年的旧记录。
  const now = new Date(2026, 10, 17, 12);

  const entries = [
    new Date(2026, 10, 17, 8),
    new Date(2026, 10, 17),
    new Date(2026, 10, 16),
    new Date(2026, 10, 15, 23, 59, 59, 999),
    new Date(2026, 10, 1),
    new Date(2026, 9, 31, 23, 59, 59, 999),
    new Date(2026, 0, 1),
    new Date(2025, 11, 31, 23, 59, 59, 999),
    new Date(2025, 9, 31, 23, 59, 59, 999),
  ].map((date) => ({ ...createEntry(0, 10), watchedAt: date.getTime() }));

  const groups = groupHistory(entries, now);

  assert.deepEqual(
    groups.map((group) => group.label),
    ['今日', '本周', '本月', '今年', '更早', '很久之前'],
  );
  assert.deepEqual(
    groups.map((group) => group.entries.length),
    [2, 1, 2, 2, 1, 1],
  );
  assert.deepEqual(
    groups.flatMap((group) => group.entries),
    entries,
  );
  assert.deepEqual(groupHistory([], now), []);
  assert.deepEqual(
    groupHistory([entries[0], entries[4]], now).map((group) => group.label),
    ['今日', '本月'],
  );
});

test('观看历史在周一、跨月和跨年时按最近日期范围归类', () => {
  // 跨年周内的记录属于本周，周日也归入周一开始的同一周。
  const cases = [
    {
      now: new Date(2026, 10, 16),
      watchedAt: new Date(2026, 10, 15, 23, 59),
      label: '本月',
    },
    {
      now: new Date(2026, 10, 1),
      watchedAt: new Date(2026, 9, 31),
      label: '本周',
    },
    {
      now: new Date(2027, 0, 1),
      watchedAt: new Date(2026, 11, 31),
      label: '本周',
    },
    {
      now: new Date(2027, 0, 1),
      watchedAt: new Date(2026, 11, 27),
      label: '更早',
    },
  ];

  for (const { now, watchedAt, label } of cases) {
    assert.deepEqual(
      groupHistory(
        [{ ...createEntry(0, 10), watchedAt: watchedAt.getTime() }],
        now,
      ).map((group) => group.label),
      [label],
    );
  }
});
