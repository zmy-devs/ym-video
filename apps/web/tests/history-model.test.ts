import assert from 'node:assert/strict';
import { test } from 'node:test';
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
  content: '',
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

test('历史操作校验影片标识、媒体 URL 和当前集进度', () => {
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
        episodes: [{ label: '非法协议', url: 'javascript:alert(1)' }],
      },
    }),
    false,
  );
});
