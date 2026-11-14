import { computed, createApp, h, nextTick, ref } from 'vue';
import type { HistoryEntry } from '@ym-video/history';
import PlayerPage from '../../src/components/player/index.vue';
import { useMedia } from '../../src/components/player/composables/use-media.ts';
import '../../src/styles/global.css';

// 每条断言描述真实媒体行为。
const assert: (condition: unknown, message: string) => asserts condition = (
  condition,
  message,
) => {
  if (!condition) {
    throw new Error(message);
  }
};

// 等待媒体加载、解码和 Vue 渲染完成。
const until = async (check: () => boolean, message: string) => {
  const deadline = Date.now() + 15000;
  while (!check()) {
    assert(Date.now() < deadline, message);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  await nextTick();
};

// MP4 和 HLS 都从真实 HTTP 地址加载。
const mediaOrigin = new URL(
  '/node_modules/.cache/player-media/',
  location.origin,
);
const mp4 = new URL('video.mp4', mediaOrigin).href;
const hls = new URL('stream.m3u8', mediaOrigin).href;

// 当前挂载页面的实际媒体控制器。
let media: ReturnType<typeof useMedia> | undefined;

// 挂载真实播放器，重试按钮重新加载同一条 HTTP 视频。
const app = createApp({
  setup: () => {
    const controller = useMedia();
    media = controller;

    const player = {
      ...controller,
      entry: ref<HistoryEntry | null>(null),
      episode: computed(() => undefined),
      loadMovie: async () => {
        controller.load(mp4, 1);
      },
      selectEpisode: async () => {},
    };

    return () => h(PlayerPage, { player });
  },
});

// 验证加载、暂停、跳转、失败及重试的完整状态流转。
const run = async () => {
  app.mount('#fixture');
  await nextTick();
  await nextTick();

  const video = document.querySelector('video');
  assert(media && video instanceof HTMLVideoElement, '播放器挂载真实媒体元素');
  video.muted = true;
  assert(String(media.status.value) === 'loading', '媒体从加载状态开始');

  media.load(mp4, 1);
  await until(
    () => media?.status.value === 'playing' && media.duration.value > 3,
    'HTTP MP4 可以加载并播放',
  );
  assert(
    video.currentSrc === mp4 && video.currentTime >= 1,
    'HTTP 地址保持原协议并恢复保存位置',
  );

  video.pause();
  await until(() => media?.status.value === 'paused', '暂停更新媒体状态');
  media.seek(2);
  await until(
    () => !!media && media.currentTime.value >= 2,
    '暂停时可以跳转进度',
  );
  await media.togglePlay();
  await until(() => media?.status.value === 'playing', '暂停后可以继续播放');

  media.fail();
  await nextTick();
  assert(
    String(media.status.value) === 'error' && video.paused,
    '失败更新状态并暂停媒体',
  );
  assert(
    document.querySelector('[data-slot="empty-title"]')?.textContent ===
      '播放失败',
    '失败文案统一显示播放失败',
  );
  assert(
    !document.querySelector('[data-slot="empty-description"]'),
    '失败界面只展示标题与重试入口',
  );

  const retry = Array.from(document.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === '重新加载',
  );
  assert(retry, '失败后提供重新加载入口');
  retry.click();
  await until(() => media?.status.value === 'playing', '重新加载后恢复播放');

  media.reset();
  assert(
    String(media.status.value) === 'loading' &&
      media.duration.value === 0 &&
      media.currentTime.value === 0 &&
      !video.getAttribute('src'),
    '重置回到加载状态并清空旧媒体',
  );

  media.load(hls, 1);
  await until(
    () => media?.status.value === 'playing' && media.duration.value > 3,
    'HTTP HLS 清单与分片可以播放',
  );

  media.load(new URL('missing.mp4', mediaOrigin).href, 0);
  await until(() => media?.status.value === 'error', '无效片源进入失败状态');
  assert(
    document.querySelector('[data-slot="empty-title"]')?.textContent ===
      '播放失败',
    '媒体加载错误统一显示播放失败',
  );
  assert(
    !document.querySelector('[data-slot="empty-description"]'),
    '媒体加载错误不追加原因',
  );

  app.unmount();
};

run()
  .then(() => {
    document.documentElement.dataset.result = 'passed';
    document
      .getElementById('status')
      ?.replaceChildren('HTTP MP4、HLS 与媒体状态测试通过');
  })
  .catch((error: unknown) => {
    document.documentElement.dataset.result = 'failed';
    document.getElementById('status')?.replaceChildren(String(error));
  });
