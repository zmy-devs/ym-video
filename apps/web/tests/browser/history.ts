import { createPinia } from 'pinia';
import { createApp, defineComponent, h } from 'vue';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { applyHistoryOperation, emptyHistory } from '@ym-video/history';
import type {
  HistoryEntry,
  HistoryOperation,
  HistorySnapshot,
} from '@ym-video/history';
import { useHistoryStore } from '../../src/stores/history';
import { readLocalHistory } from '../../src/services/history';
import { usePlayer } from '../../src/composables/use-player';

// 此页面不访问实际 API，只在专用测试源写入浏览器存储。
const results = document.querySelector('#results');
const status = document.querySelector('#status');
const button = document.querySelector<HTMLButtonElement>('#run');
const stores: ReturnType<typeof useHistoryStore>[] = [];
const clouds = new Map<string, HistorySnapshot>();
let online = false;
let failSync = false;
let loseResponse = false;
let syncRequests = 0;
let activeRequests = 0;
let maxActiveRequests = 0;
let releaseFetch: (() => void) | undefined;
let holdFetch: Promise<void> | undefined;

// 使用显式测试开关模拟离线，不改变系统网络设置。
Object.defineProperty(navigator, 'onLine', {
  configurable: true,
  get: () => online,
});

// 快照经过 JSON 序列化，避免测试后端和客户端共享对象。
window.fetch = async (_input, init) => {
  if (!online) {
    throw new TypeError('测试断网');
  }
  const body = init?.body
    ? (JSON.parse(String(init.body)) as {
        ownerId: string;
        operations: HistoryOperation[];
      })
    : null;
  const owner = body?.ownerId ?? stores.at(-1)?.ownerId ?? 'browser-a';
  if (!body) {
    if (holdFetch) {
      await holdFetch;
    }
    return Response.json(clouds.get(owner) ?? emptyHistory(owner));
  }
  syncRequests += 1;
  if (failSync) {
    throw new TypeError('测试服务不可用');
  }
  activeRequests += 1;
  maxActiveRequests = Math.max(maxActiveRequests, activeRequests);
  await new Promise((resolve) => setTimeout(resolve, 25));
  let snapshot = clouds.get(owner) ?? emptyHistory(owner);
  for (const operation of body.operations) {
    const next = applyHistoryOperation(snapshot, operation);
    if (next !== snapshot) {
      snapshot = { ...next, revision: snapshot.revision + 1 };
    }
  }
  clouds.set(owner, snapshot);
  activeRequests -= 1;
  if (loseResponse) {
    loseResponse = false;
    throw new TypeError('服务端已提交，但响应丢失');
  }
  return Response.json(snapshot);
};

// 生成带独立进度的可校验影片，时间由测试场景控制。
const entry = (seconds = 20, watchedAt = Date.now()): HistoryEntry => ({
  id: 'source:movie',
  sourceId: 'source',
  vodId: 'movie',
  name: '浏览器测试影片',
  pic: '',
  content: '',
  year: '',
  area: '',
  lang: '',
  category: '',
  remarks: '',
  episodes: [{ label: '第 1 集', url: 'https://media.example/1.mp4' }],
  episode: 0,
  progress: { '0': { currentTime: seconds, duration: 100 } },
  watchedAt,
});

// 每次创建独立 Pinia 应用上下文，保留同源持久化数据。
const createStore = async (owner: string) => {
  const store = useHistoryStore(createPinia());
  stores.push(store);
  await store.setAccount(owner);
  return store;
};

// 有界等待异步存储和跨文档消息，不依赖固定的网络耗时。
const until = async (check: () => boolean) => {
  const deadline = Date.now() + 5_000;
  while (!check()) {
    if (Date.now() > deadline) {
      throw new Error('等待条件超时');
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
};

// 断言失败时将具体原因保留在页面，方便浏览器与人工复查。
const assert = (condition: unknown, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

// 每个场景独立输出结果，失败时停止，避免连带产生误导结果。
const test = async (name: string, action: () => Promise<void>) => {
  await action();
  const item = document.createElement('li');
  item.textContent = `通过：${name}`;
  results?.append(item);
};

// 测试仅在独立的临时开发端口执行，避免触及开发者正常浏览数据。
const run = async () => {
  if (location.origin !== 'http://localhost:5180') {
    throw new Error(
      '请在 http://localhost:5180/tests/browser/history.html 运行',
    );
  }
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('ym-video-web');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('请关闭其他测试页面后重试'));
  });
  const first = await createStore('browser-a');
  await test('离线先持久化，等待联网后补传', async () => {
    assert(
      await first.save(entry(), first.token('source:movie')),
      '本地保存应成功',
    );
    const local = await readLocalHistory('browser-a');
    assert(
      local.operations.length === 1 && first.syncStatus === 'pending',
      '队列应持久化',
    );
    assert(syncRequests === 0, '离线不得上传');
  });

  first.$dispose();
  const restored = await createStore('browser-a');
  await test('重新创建应用后恢复持久化队列，按账号隔离', async () => {
    assert(
      restored.entries[0]?.progress['0'].currentTime === 20,
      '应用重载后应恢复进度',
    );
    await restored.setAccount('browser-b');
    assert(restored.entries.length === 0, '另一个账号不应看到历史');
    await restored.setAccount('browser-a');
    assert(restored.entries.length === 1, '切回账号恢复自己的待传记录');
  });

  await test('断网重试失败不会热循环，恢复网络后补传', async () => {
    online = true;
    failSync = true;
    await restored.retry();
    await until(() => restored.syncStatus === 'error');
    const attempts = syncRequests;
    await new Promise((resolve) => setTimeout(resolve, 150));
    assert(syncRequests === attempts, '失败后不应立即重复请求');
    failSync = false;
    await restored.retry();
    await until(() => restored.syncStatus === 'synced');
    assert(
      (await readLocalHistory('browser-a')).operations.length === 0,
      '成功后应清除队列',
    );
  });

  await test('响应丢失后重复补传幂等，主动从头播放保留零进度', async () => {
    loseResponse = true;
    await restored.save(entry(0), restored.token('source:movie'));
    await until(() => restored.syncStatus === 'error');
    const revision = clouds.get('browser-a')?.revision;
    await restored.retry();
    await until(() => restored.syncStatus === 'synced');
    assert(clouds.get('browser-a')?.revision === revision, '补传不应重复修改');
    assert(
      restored.entries[0]?.progress['0'].currentTime === 0,
      '从头播放必须是零',
    );
  });

  await test('删除、清空后的旧播放器失效，同毫秒重新打开仍按因果顺序保存', async () => {
    online = false;
    const old = restored.token('source:movie');
    await restored.remove('source:movie');
    assert(!(await restored.save(entry(80), old)), '删除后旧播放器不得重建');
    await restored.save(entry(5), restored.token('source:movie'));
    await restored.clear();
    await restored.save(entry(7), restored.token('source:movie'));
    assert(
      restored.entries[0]?.progress['0'].currentTime === 7,
      '清空后主动打开可新建',
    );
    online = true;
    await restored.retry();
    await until(() => restored.syncStatus === 'synced');
    assert(
      clouds.get('browser-a')?.records[0]?.entry?.progress['0'].currentTime ===
        7,
      '补传顺序不得打乱',
    );
  });

  await test('已取消的旧账号响应不能污染新账号状态', async () => {
    holdFetch = new Promise((resolve) => {
      releaseFetch = resolve;
    });
    const oldRequest = restored.refresh();
    await restored.setAccount('browser-b');
    holdFetch = undefined;
    releaseFetch?.();
    await oldRequest;
    await restored.refresh();
    assert(
      restored.ownerId === 'browser-b' && restored.entries.length === 0,
      '旧账号响应应被忽略',
    );
    await restored.setAccount('browser-a');
    await restored.refresh();
  });

  await test('两个应用上下文共用队列与上传锁，消息同步后不丢进度', async () => {
    online = false;
    const peer = await createStore('browser-a');
    const at = Date.now();
    await Promise.all([
      restored.save(entry(31, at), restored.token('source:movie')),
      peer.save(entry(42, at + 1), peer.token('source:movie')),
    ]);
    online = true;
    await Promise.all([restored.retry(), peer.retry()]);
    await until(
      () => restored.syncStatus === 'synced' && peer.syncStatus === 'synced',
    );
    assert(maxActiveRequests === 1, '同账号上传应串行');
    assert(
      restored.entries[0]?.progress['0'].currentTime === 42,
      '新观看应胜出',
    );
    assert(peer.entries[0]?.progress['0'].currentTime === 42, '跨上下文应更新');
    peer.$dispose();
  });

  await test('暂停旧实例再次保存不刷新观看时间，不覆盖较新设备进度', async () => {
    const paused = entry(42, Date.now());
    await restored.save(paused, restored.token('source:movie'));
    await until(() => restored.syncStatus === 'synced');
    await restored.save(
      entry(77, paused.watchedAt + 1),
      restored.token('source:movie'),
    );
    await until(() => restored.syncStatus === 'synced');
    await restored.save(paused, restored.token('source:movie'));
    await until(() => restored.syncStatus === 'synced');
    assert(
      restored.entries[0]?.progress['0'].currentTime === 77,
      '旧暂停保存不能覆盖更新的观看',
    );
  });

  await test('IndexedDB 写入失败明确报错，不伪装保存成功；账号切换不继承旧错误', async () => {
    const original = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = () => {
      throw new DOMException('测试存储失败', 'QuotaExceededError');
    };
    try {
      const saved = await restored.save(
        entry(88),
        restored.token('source:movie'),
      );
      assert(
        !saved && restored.syncStatus === 'error',
        '存储失败不得显示已保存',
      );
      const pending = restored.save(entry(89), restored.token('source:movie'));
      const switched = restored.setAccount(null);
      await Promise.all([pending, switched]);
      assert(
        restored.ownerId === null && restored.syncStatus === 'synced',
        '旧写入失败不得污染新账号',
      );
    } finally {
      IDBDatabase.prototype.transaction = original;
    }
  });
  await test('实际播放器刷新详情、重载、续播、缩减集数、离线回退与账号切换', async () => {
    online = false;
    const pinia = createPinia();
    const playerHistory = useHistoryStore(pinia);
    stores.push(playerHistory);
    await playerHistory.setAccount('browser-a');
    const movie = entry(44);
    await playerHistory.save(movie, playerHistory.token(movie.id));
    movie.episodes.push({
      label: '第 2 集',
      url: 'http://localhost:5180/test-video.mp4',
    });
    movie.episode = 1;
    movie.progress = { '1': { currentTime: 44, duration: 100 } };
    movie.watchedAt += 1;
    await playerHistory.save(movie, playerHistory.token(movie.id));

    let player: ReturnType<typeof usePlayer> | undefined;
    const component = defineComponent({
      setup: () => {
        player = usePlayer();
        return () => h('video', { ref: player?.video });
      },
    });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/player/:sourceId/:vodId', component }],
    });
    await router.push('/player/source/movie?restart=1');
    await router.isReady();
    const mount = document.createElement('div');
    document.body.append(mount);
    const play = HTMLMediaElement.prototype.play;
    const load = HTMLMediaElement.prototype.load;
    const originalFetch = window.fetch;
    HTMLMediaElement.prototype.play = () => Promise.resolve();
    HTMLMediaElement.prototype.load = () => {};
    const app = createApp({ render: () => h(RouterView) })
      .use(pinia)
      .use(router);
    try {
      app.mount(mount);
      await until(() =>
        Boolean(
          player?.entry.value &&
            !player.loading.value &&
            !router.currentRoute.value.query.restart,
        ),
      );
      const active = player;
      assert(active?.entry.value?.episode === 1, '应恢复当前集');
      assert(
        active?.entry.value?.progress['1'].currentTime === 0,
        '主动从头播放应覆盖旧进度',
      );
      if (!active?.video.value || !active.entry.value) {
        throw new Error('播放器尚未就绪');
      }
      Object.defineProperty(active.video.value, 'duration', {
        configurable: true,
        value: 100,
      });
      active.handleMetadata();
      active.video.value.currentTime = 12;
      active.handleTime();
      active.handlePause();
      await active.save();
      const watchedAt = active.entry.value.watchedAt;
      await new Promise((resolve) => setTimeout(resolve, 30));
      await active.save();
      assert(
        active.entry.value.watchedAt === watchedAt,
        '重复保存不得刷新实际观看时间',
      );

      // 详情与历史同步走真实服务层，只替换上游数据与网络时序。
      let detailRequests = 0;

      // 模拟详情接口暂时不可用。
      let detailFailure = false;

      // 控制上游新增或缩减集数。
      let episodeCount = 3;

      // 模拟接口明确返回影片已下架。
      let missingMovie = false;

      // 释放暂挂的详情响应，检查异步请求取消。
      let releaseDetails: (() => void) | undefined;

      // 让详情响应晚于新的加载操作或账号切换。
      let heldDetails: Promise<void> | undefined;
      window.fetch = async (input, init) => {
        // 只拦截影片详情，历史接口仍由原测试服务处理。
        const url = new URL(
          input instanceof Request ? input.url : String(input),
          location.origin,
        );
        if (url.pathname !== '/api/v1/proxy/source') {
          return originalFetch(input, init);
        }
        // 在等待前捕获编号，使迟到响应仍携带旧地址。
        const request = ++detailRequests;
        assert(url.searchParams.get('ids') === 'movie', '应查询当前影片详情');
        if (heldDetails) {
          await heldDetails;
        }
        if (detailFailure) {
          return Response.json(
            { message: '测试详情接口失败' },
            { status: 503 },
          );
        }
        return Response.json({
          list: missingMovie
            ? []
            : [
                {
                  vod_id: 'movie',
                  vod_name: '已更新的影片',
                  vod_play_url: Array.from(
                    { length: episodeCount },
                    (_, index) =>
                      `第 ${index + 1} 集$http://localhost:5180/test-video.mp4?v=${request}-${index}`,
                  ).join('#'),
                },
              ],
          pagecount: 1,
        });
      };

      await active.loadMovie();
      assert(detailRequests === 1, '已有历史也必须查询最新详情');
      assert(active.entry.value?.episodes.length === 3, '应显示新增的第 3 集');
      assert(active.entry.value?.name === '已更新的影片', '影片信息应同步更新');
      assert(active.entry.value?.episode === 1, '更新后应保留当前集');
      assert(
        active.entry.value?.progress['0'].currentTime === 44 &&
          active.entry.value.progress['1'].currentTime === 12,
        '更新详情不得丢失各集进度',
      );
      assert(
        active.video.value.src.endsWith('?v=1-1'),
        '实际媒体元素应使用最新地址',
      );
      active.handleMetadata();
      assert(active.video.value.currentTime === 12, '应从原进度续播');

      // 选集只使用已加载的媒体地址，不再次查询账号或刷新集数。
      await active.selectEpisode(2);
      assert(detailRequests === 1, '切集不得重复刷新影片详情');
      assert(active.entry.value.episode === 2, '应直接切到已有的第 3 集');
      await active.selectEpisode(1);

      await active.loadMovie();
      assert(detailRequests === 2, '重新加载必须再次查询详情');
      assert(
        active.video.value.src.endsWith('?v=2-1'),
        '重新加载必须替换已失效的播放地址',
      );
      assert(
        playerHistory.entries[0]?.episodes.length === 3,
        '最新集数应保存进观看历史',
      );

      heldDetails = new Promise((resolve) => {
        releaseDetails = resolve;
      });
      // 旧加载暂挂期间再次重载，旧响应不得覆盖最新地址。
      const pendingReload = active.loadMovie();
      await until(() => detailRequests === 3);
      heldDetails = undefined;
      await active.loadMovie();
      releaseDetails?.();
      await pendingReload;
      assert(
        detailRequests === 4 && active.video.value.src.endsWith('?v=4-1'),
        '迟到的旧详情不得覆盖新重载结果',
      );

      detailFailure = true;
      await active.loadMovie();
      assert(
        active.entry.value?.episodes.length === 3 &&
          active.video.value.src.endsWith('?v=4-1'),
        '详情请求失败应回退到最近一次可用信息',
      );
      assert(
        active.entry.value?.progress['1'].currentTime === 12,
        '请求失败不得清除续播进度',
      );
      detailFailure = false;

      episodeCount = 1;
      await active.loadMovie();
      assert(active.entry.value?.episode === 0, '集数缩减后应回到有效集');
      assert(
        active.entry.value?.progress['0'].currentTime === 44 &&
          !('1' in active.entry.value.progress),
        '应保留有效进度并清理越界进度',
      );

      missingMovie = true;
      await active.loadMovie();
      assert(
        !active.entry.value && active.error.value.includes('下架'),
        '接口确认下架时应提示错误，不继续使用过期地址',
      );
      assert(playerHistory.entries.length === 1, '下架不得删除原观看记录');
      missingMovie = false;
      episodeCount = 0;
      await active.loadMovie();
      assert(
        !active.entry.value && active.error.value.includes('暂无可播放集数'),
        '空集数应提示错误，不覆盖有效历史',
      );
      assert(
        playerHistory.entries[0]?.episodes.length === 1,
        '空详情不得覆盖有效历史',
      );

      episodeCount = 2;
      await active.loadMovie();
      heldDetails = new Promise((resolve) => {
        releaseDetails = resolve;
      });

      // 确认详情已发出后再切账号，复现旧请求迟到的情况。
      const requestsBeforeSwitch = detailRequests;
      const pendingLoad = active.loadMovie();
      await until(() => detailRequests > requestsBeforeSwitch);
      await playerHistory.setAccount('browser-b');
      heldDetails = undefined;
      releaseDetails?.();
      await pendingLoad;
      assert(active.entry.value === null, '切账号应立即清理旧播放器');
      assert(playerHistory.entries.length === 0, '迟到详情不得写入新账号');
    } finally {
      app.unmount();
      mount.remove();
      HTMLMediaElement.prototype.play = play;
      HTMLMediaElement.prototype.load = load;
      window.fetch = originalFetch;
    }
  });
  stores.forEach((store) => store.$dispose());
};

button?.addEventListener('click', () => {
  button.disabled = true;
  if (status) {
    status.textContent = '正在运行';
  }
  run()
    .then(() => {
      if (status) {
        status.textContent = '全部通过（10 个场景）';
      }
    })
    .catch((cause: unknown) => {
      if (status) {
        status.textContent = `失败：${cause instanceof Error ? cause.message : String(cause)}`;
      }
    });
});
