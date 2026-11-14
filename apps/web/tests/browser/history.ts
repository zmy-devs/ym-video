import { createPinia, setActivePinia } from 'pinia';
import { applyHistoryOperation, emptyHistory } from '@ym-video/history';
import type { HistoryEntry, HistoryOperation } from '@ym-video/history';
import { useHistoryStore } from '../../src/stores/history-store.ts';
import {
  commitHistorySync,
  readLocalHistory,
} from '../../src/services/history-storage.ts';

// 回归真实 IndexedDB 队列与自动上传的业务行为。
const assert: (value: unknown, message: string) => asserts value = (
  value,
  message,
) => {
  if (!value) {
    throw new Error(message);
  }
};

// 等待自动补传和事务完成。
const until = async (check: () => boolean, message: string) => {
  const deadline = Date.now() + 15000;
  while (!check()) {
    assert(Date.now() < deadline, message);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
};

// 每轮使用独立账号，网络响应遵循实际历史接口协议。
const run = async () => {
  const ownerId = crypto.randomUUID();
  let cloud = emptyHistory(ownerId);
  let rejectUploads = true;
  let transientFailures = 2;
  const uploads: string[] = [];
  const fetch = window.fetch;
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: false,
  });

  window.fetch = async (input, init) => {
    const request = new Request(input, init);
    const path = new URL(request.url).pathname;
    if (path === '/api/v1/history') {
      return Response.json(cloud);
    }
    if (path !== '/api/v1/history/sync') {
      return fetch(input, init);
    }

    const body = await request.text();
    uploads.push(body);
    if (rejectUploads) {
      return Response.json({ code: 'BAD_REQUEST' }, { status: 400 });
    }
    if (transientFailures > 0) {
      transientFailures--;
      return new Response('暂时不可用', { status: 503 });
    }

    // 服务端逐项处理同一批操作，返回完整快照。
    const data: { ownerId: string; operations: HistoryOperation[] } =
      JSON.parse(body);
    assert(data.ownerId === ownerId, '上传使用正确账号');
    assert(data.operations.length <= 20, '每批最多二十项');
    assert(
      new TextEncoder().encode(body).byteLength < 1_000_000,
      '请求体符合服务端上限',
    );
    for (const operation of data.operations) {
      cloud = applyHistoryOperation(cloud, operation);
    }
    cloud = { ...cloud, revision: cloud.revision + 1 };
    return Response.json(cloud);
  };

  // 离线写入二十五次实际观看，确保恢复后需要分两批上传。
  setActivePinia(createPinia());
  let history = useHistoryStore();
  await history.setAccount(ownerId);
  const entry: HistoryEntry = {
    id: 'test:1',
    sourceId: 'test',
    vodId: '1',
    name: '历史补传测试',
    pic: '',
    year: '',
    area: '',
    lang: '',
    category: '',
    remarks: '完结',
    episodes: [{ label: '第一集', url: 'http://media.example/1.m3u8' }],
    episode: 0,
    progress: {},
    watchedAt: Date.now(),
  };
  for (let index = 0; index < 25; index++) {
    entry.progress['0'] = { currentTime: index, duration: 100 };
    entry.watchedAt++;
    assert(
      await history.save(entry, history.token(entry.id)),
      '离线进度写入成功',
    );
  }
  const pending = await readLocalHistory(ownerId);
  assert(
    pending.operations.length === 25 && Number(uploads.length) === 0,
    '离线时只持久化本机队列',
  );

  // 重建数据层模拟重新打开应用，恢复此前的待上传进度。
  history.$dispose();
  setActivePinia(createPinia());
  history = useHistoryStore();
  await history.setAccount(ownerId);
  assert(
    history.entries[0]?.progress['0']?.currentTime === 24,
    '重启后恢复本机最新进度',
  );
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: true,
  });
  await history.refresh();
  await until(() => history.syncStatus === 'error', '永久请求错误停止上传');
  assert(
    (await readLocalHistory(ownerId)).operations.length === 25,
    '上传失败保留全部队列',
  );
  assert(Number(uploads.length) === 1, '永久错误只发送一次');

  // 临时服务失败由请求库重试，成功后继续发送剩余批次。
  rejectUploads = false;
  await history.refresh();
  await until(
    () => history.syncStatus === 'synced',
    '恢复后自动重试并完成补传',
  );
  assert(
    uploads[1] === uploads[2] && uploads[2] === uploads[3],
    '重试保留相同批次和操作标识',
  );
  assert(JSON.parse(uploads[4]).operations.length === 5, '第二批上传剩余五项');
  const synced = await readLocalHistory(ownerId);
  assert(
    synced.operations.length === 0 &&
      synced.snapshot.records[0]?.entry?.progress['0']?.currentTime === 24,
    '成功后同时保存快照并移除确认项',
  );

  // 删除和清空后的旧播放器不能重新创建历史记录。
  const beforeRemove = history.token(entry.id);
  await history.remove(entry.id);
  entry.watchedAt++;
  assert(
    !(await history.save(entry, beforeRemove)),
    '删除拒绝旧播放器迟到保存',
  );
  await until(() => history.syncStatus === 'synced', '删除同步完成');
  assert(
    await history.save(entry, history.token(entry.id)),
    '重新打开影片允许建立新记录',
  );
  await until(() => history.syncStatus === 'synced', '重新观看同步完成');
  const beforeClear = history.token(entry.id);
  await history.clear();
  assert(!(await history.save(entry, beforeClear)), '清空拒绝旧播放器迟到保存');
  await until(() => history.syncStatus === 'synced', '清空同步完成');

  // 迟到的旧快照不能覆盖同账号较新的确认版本。
  const late = await commitHistorySync(ownerId, emptyHistory(ownerId), []);
  assert(
    late.snapshot.epoch === cloud.epoch && late.snapshot.records.length === 0,
    '同账号乱序响应保留最新版本',
  );

  history.$dispose();
  window.fetch = fetch;
  Reflect.deleteProperty(navigator, 'onLine');
};

run()
  .then(() => {
    document.documentElement.dataset.result = 'passed';
    document
      .getElementById('status')
      ?.replaceChildren('离线历史、自动补传与确认事务测试通过');
  })
  .catch((error: unknown) => {
    document.documentElement.dataset.result = 'failed';
    document.getElementById('status')?.replaceChildren(String(error));
  });
