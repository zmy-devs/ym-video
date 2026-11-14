import { createApp, h, nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import type { HistoryEntry } from '@ym-video/history';
import PlayerPage from '../../src/components/player/index.vue';
import { usePlayer } from '../../src/components/player/composables/use-player.ts';
import { useHistoryStore } from '../../src/stores/history-store.ts';
import '../../src/styles/global.css';

// 断言真实播放行为和本机历史写入。
const assert: (condition: unknown, message: string) => asserts condition = (
  condition,
  message,
) => {
  if (!condition) {
    throw new Error(message);
  }
};

// 等待媒体事件或 IndexedDB 事务完成。
const until = async (check: () => boolean, message: string) => {
  const deadline = Date.now() + 15000;
  while (!check()) {
    assert(Date.now() < deadline, message);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  await nextTick();
};

// 在离线账号中验证本机保存，不依赖账号接口或云端同步。
const run = async () => {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: false,
  });

  // 每轮测试使用独立账号和真实历史存储。
  const pinia = createPinia();
  setActivePinia(pinia);
  const history = useHistoryStore();
  await history.setAccount(crypto.randomUUID());

  // 两集共用本机 HTTP 视频，使用不同地址区分切集。
  const url = new URL(
    '/node_modules/.cache/player-media/video.mp4',
    location.origin,
  );
  const entry: HistoryEntry = {
    id: 'test:1',
    sourceId: 'test',
    vodId: '1',
    name: '进度保存测试',
    pic: '',
    year: '',
    area: '',
    lang: '',
    category: '',
    remarks: '完结',
    episodes: [
      { label: '第一集', url: url.href },
      { label: '第二集', url: `${url.href}?episode=2` },
    ],
    episode: 0,
    watchedAt: Date.now(),
    progress: { '0': { currentTime: 0, duration: 4 } },
  };
  await history.save(entry, history.token(entry.id));

  // 统计持久化入口调用，同时沿用真实存储行为。
  const save = history.save;
  let saves = 0;
  history.save = (...args) => {
    saves++;
    return save(...args);
  };

  // 挂载真实播放路由，离开时执行真实路由守卫。
  let player: ReturnType<typeof usePlayer> | undefined;
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/player/:sourceId/:vodId',
        component: {
          setup: () => {
            const controller = usePlayer();
            player = controller;
            return () => h(PlayerPage, { player: controller });
          },
        },
      },
      { path: '/done', component: { render: () => null } },
    ],
  });
  await router.push('/player/test/1');
  const app = createApp({ render: () => h(RouterView) })
    .use(pinia)
    .use(router);
  app.mount('#fixture');
  await nextTick();

  // 静音允许无头浏览器执行自动播放。
  const video = document.querySelector('video');
  assert(player && video instanceof HTMLVideoElement, '挂载真实播放器');
  video.muted = true;
  await until(() => player?.status.value === 'playing', '从本机历史打开影片');

  // 跨过原来的十秒保存间隔，正常播放和跳转都不写历史。
  player.setRate(0.1);
  const playingSaves = saves;
  player.seek(1);
  await new Promise((resolve) => setTimeout(resolve, 10200));
  assert(saves === playingSaves, '正常播放和进度跳转不触发保存');

  video.pause();
  await until(
    () => (history.entries[0]?.progress['0']?.currentTime ?? 0) >= 2,
    '暂停时保存真实播放位置',
  );
  assert(saves === playingSaves + 1, '一次暂停只保存一次');

  player.seek(2.8);
  await until(() => !video.seeking, '暂停时完成进度跳转');
  assert(saves === playingSaves + 1, '暂停后的跳转等待下一关键节点保存');

  await player.selectEpisode(1);
  assert(
    history.entries[0]?.progress['0']?.currentTime === 2.8 &&
      history.entries[0].episode === 1,
    '切集前保存上一集最新位置，并记录选中集数',
  );
  await until(() => player?.status.value === 'playing', '切集后继续播放');

  player.setRate(1);
  player.seek(3.9);
  await until(
    () => (history.entries[0]?.progress['1']?.currentTime ?? 0) >= 3.9,
    '最后一集结束时保存末尾位置',
  );

  await player.selectEpisode(0);
  await until(() => player?.status.value === 'playing', '切回第一集');
  player.seek(3.9);
  await until(
    () =>
      player?.entry.value?.episode === 1 && player.status.value === 'playing',
    '第一集结束后保存并自动播放下一集',
  );

  // 后台保存使用可见性事件，读取尚未暂停的实时位置。
  player.seek(1);
  await until(() => !video.seeking, '后台前完成进度跳转');
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    value: true,
  });
  document.dispatchEvent(new Event('visibilitychange'));
  await until(
    () => (history.entries[0]?.progress['1']?.currentTime ?? 0) < 2,
    '进入后台时保存当前位置',
  );
  Reflect.deleteProperty(document, 'hidden');

  player.seek(2.5);
  await until(() => !video.seeking, '离开前完成进度跳转');
  await router.push('/done');
  assert(
    (history.entries[0]?.progress['1']?.currentTime ?? 0) >= 2.5,
    '离开播放页前等待最新位置保存完成',
  );

  app.unmount();
  history.$dispose();
  Reflect.deleteProperty(navigator, 'onLine');
};

run()
  .then(() => {
    document.documentElement.dataset.result = 'passed';
    document
      .getElementById('status')
      ?.replaceChildren('关键播放节点保存测试通过');
  })
  .catch((error: unknown) => {
    document.documentElement.dataset.result = 'failed';
    document.getElementById('status')?.replaceChildren(String(error));
  });
