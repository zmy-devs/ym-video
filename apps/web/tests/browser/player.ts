import { computed, createApp, h, nextTick, ref } from 'vue';
import type { HistoryEntry } from '@ym-video/history';
import PlayerPage from '../../src/components/player/index.vue';
import { useMedia } from '../../src/components/player/composables/use-media.ts';
import { isMobile } from '../../src/platform.ts';
import { Sheet, SheetContent, SheetTitle } from '@ym-video/ui/components/sheet';
import '../../src/styles/global.css';

// 断言保留具体行为，浏览器失败时直接报告对应场景。
const assert: (condition: unknown, message: string) => asserts condition = (
  condition,
  message,
) => {
  if (!condition) {
    throw new Error(message);
  }
};

// 通过原生指针事件轻触画面，保留浏览器的事件顺序。
const clickVideo = (video: HTMLVideoElement) => {
  video.dispatchEvent(
    new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true }),
  );
  video.dispatchEvent(
    new PointerEvent('pointerup', { pointerType: 'touch', bubbles: true }),
  );
  video.dispatchEvent(
    new PointerEvent('click', { pointerType: 'touch', bubbles: true }),
  );
};

// 单击需要等待播放器的双击判定窗口。
const tap = async (video: HTMLVideoElement) => {
  clickVideo(video);
  await new Promise((resolve) => setTimeout(resolve, 350));
  await nextTick();
};

// 等待菜单动画与响应式更新，失败时保留具体场景。
const until = async (check: () => boolean, message: string) => {
  const deadline = Date.now() + 5000;
  while (!check()) {
    assert(Date.now() < deadline, message);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  await nextTick();
};

// 双指开合驱动真实手势监听器，验证缩放时的控件状态。
const pinch = async (video: HTMLVideoElement, distance: number) => {
  for (const [type, points] of [
    [
      'touchstart',
      [
        [100, 100],
        [200, 100],
      ],
    ],
    [
      'touchmove',
      [
        [100, 100],
        [100 + distance, 100],
      ],
    ],
    ['touchend', []],
  ] as const) {
    // 每个手指使用独立触点，结束事件释放全部触点。
    const touches = points.map(
      ([clientX, clientY], identifier) =>
        new Touch({ identifier, target: video, clientX, clientY }),
    );

    video.dispatchEvent(
      new TouchEvent(type, {
        bubbles: true,
        cancelable: true,
        touches,
        targetTouches: touches,
      }),
    );
  }
  await nextTick();
};

// 使用真实播放器组件，仅固定媒体状态，测试不请求外部片源。
const run = async () => {
  // 记录实际控件触发的媒体操作，避免依赖外部视频解码。
  const selectedEpisodes: number[] = [];
  const rateChanges: number[] = [];
  let playbackToggles = 0;

  // 影片信息覆盖名称、集数和完整控制栏。
  const entry = ref<HistoryEntry | null>({
    id: 'player-test',
    vodId: 'player-test',
    sourceId: 'player-test',
    name: '怪奇物语第二季',
    pic: '',
    year: '2017',
    area: '',
    lang: '',
    category: '',
    remarks: '',
    episodes: [
      { label: '第01集', url: 'https://example.com/1.mp4' },
      { label: '第02集', url: 'https://example.com/2.mp4' },
    ],
    episode: 0,
    progress: {},
    watchedAt: 0,
  });

  // 组件在独立作用域内注册媒体、快捷键和触屏监听。
  const createPlayerApp = () =>
    createApp({
      setup: () => {
        // 固定播放时长和进度，让两端使用相同的布局断言。
        const media = useMedia();
        media.duration.value = 100;
        media.currentTime.value = 25;
        media.fullscreen.value = !isMobile;

        // 播放器契约保持稳定，视图更新只消费媒体状态。
        const player = {
          ...media,
          status: computed(() => 'playing' as const),
          entry,
          episode: computed(() => entry.value?.episodes[entry.value.episode]),
          loadMovie: async () => {},
          selectEpisode: async (index: number) => {
            selectedEpisodes.push(index);
            if (entry.value) {
              entry.value.episode = index;
            }
          },
          setRate: (value: number) => {
            rateChanges.push(value);
            media.setRate(value);
          },
          seek: (seconds: number) => {
            media.currentTime.value = Math.max(
              0,
              Math.min(seconds, media.duration.value),
            );
          },
          togglePlay: async () => {
            playbackToggles += 1;
          },
        };

        // 桌面使用实际的 Sheet 容器，覆盖与播放路由相同的布局。
        const page = () =>
          h(PlayerPage, {
            player,
            headerClass: isMobile ? undefined : 'desktop-title-bar',
            'data-theme-color': 'yellow',
          });

        return () =>
          isMobile
            ? page()
            : h(Sheet, { open: true }, () =>
                h(
                  SheetContent,
                  {
                    side: 'bottom',
                    showOverlay: false,
                    showCloseButton: false,
                    class: 'dark h-full w-full gap-0 border-0 p-0',
                  },
                  () => [
                    h(SheetTitle, { class: 'sr-only' }, () => '播放器'),
                    page(),
                  ],
                ),
              );
      },
    });

  // 每次进入播放页都创建当前页面的状态与事件订阅。
  let app = createPlayerApp();
  app.mount('#fixture');
  await nextTick();
  await nextTick();

  // 查询真实 DOM，检查控制栏外层与进度条各自负责的间距。
  const video = document.querySelector('video');
  const progress = document.querySelector('input[type="range"]');
  assert(video instanceof HTMLVideoElement, '播放器已挂载视频元素');
  assert(progress instanceof HTMLInputElement, '播放器已挂载进度条');

  // 进度组件父级集中维护底部留白，移动端只保留安全区间距。
  const progressGroup = progress.parentElement?.parentElement;
  const controls = progressGroup?.parentElement;
  assert(progressGroup && controls, '控制栏与进度条层级正确');

  // 标题栏、视频与悬浮层各自直接归属播放器布局。
  const surface = document.querySelector('.player-surface');
  const overlay = document.querySelector('.player-overlay');
  const mini = document.querySelector('[data-slot="player-mini-progress"]');
  assert(
    surface && overlay && mini instanceof HTMLElement,
    '播放器包含视频区与悬浮控件',
  );
  // 桌面容器进入动画结束后检查最终布局。
  const sheet = surface.closest('[data-slot="sheet-content"]');
  if (sheet) {
    await Promise.all(
      sheet.getAnimations().map((animation) => animation.finished),
    );
  }
  assert(
    surface.parentElement?.classList.contains('player-page'),
    '视频区直接放在播放器内',
  );
  assert(
    video.parentElement === surface && overlay.parentElement === surface,
    '视频与悬浮控件是同级元素',
  );
  assert(
    controls.parentElement === overlay && mini.parentElement === overlay,
    '大小进度条共用一层悬浮布局',
  );
  assert(
    getComputedStyle(mini).display === 'none',
    '完整控件显示时隐藏小进度条',
  );
  assert(
    getComputedStyle(progressGroup).paddingBottom === '0px',
    '进度组件不承担底部留白',
  );
  assert(
    getComputedStyle(controls).paddingBottom === '8px',
    '控制栏外层保留 8px 底部留白',
  );
  assert(
    getComputedStyle(controls).paddingInlineStart ===
      (isMobile ? '0px' : '16px'),
    '双端控制栏使用各自的水平间距',
  );

  if (isMobile) {
    // 模拟横屏安全区，只有悬浮层内容需要水平内边距。
    const page = surface.parentElement;
    assert(page instanceof HTMLElement, '播放器存在安全区变量的作用域');
    page.style.setProperty('--player-safe-x', '24px');
    assert(
      getComputedStyle(overlay).paddingInlineStart === '24px' &&
        getComputedStyle(overlay).paddingInlineEnd === '24px',
      '移动端安全区使用左右 padding',
    );
    assert(
      video.getBoundingClientRect().width ===
        surface.getBoundingClientRect().width,
      '安全区不缩小视频画面',
    );
    page.style.removeProperty('--player-safe-x');
  }

  await tap(video);

  // 控件隐藏时的小进度条只绘制已播放部分。
  assert(getComputedStyle(controls).display === 'none', '轻触后完整控件隐藏');
  assert(
    getComputedStyle(mini).display !== 'none',
    '完整控件隐藏时显示小进度条',
  );
  assert(getComputedStyle(mini).height === '1px', '小进度条高度为 1px');
  assert(
    Math.abs(
      overlay.getBoundingClientRect().bottom -
        mini.getBoundingClientRect().bottom -
        (isMobile ? 0 : 1),
    ) < 0.5,
    '小进度条位于底部，桌面全屏保留 1px 边缘间距',
  );
  assert(
    getComputedStyle(mini).backgroundColor === 'rgba(0, 0, 0, 0)',
    '小进度条轨道透明',
  );
  assert(
    mini.firstElementChild instanceof HTMLElement &&
      mini.firstElementChild.style.getPropertyValue('width') === '25%',
    '小进度条展示真实播放比例',
  );

  await pinch(video, 150);
  assert(
    video.style.getPropertyValue('transform') === 'scale(1.5)',
    '双指张开可以放大画面',
  );
  assert(
    getComputedStyle(controls).display === 'none',
    '隐藏控件时放大不会唤出控件',
  );

  await pinch(video, 50);
  assert(
    video.style.getPropertyValue('transform') === 'scale(0.75)',
    '双指合拢可以缩小画面',
  );
  assert(
    getComputedStyle(controls).display === 'none',
    '隐藏控件时缩小不会唤出控件',
  );

  await tap(video);

  assert(
    getComputedStyle(mini).display === 'none',
    '重新显示完整控件后隐藏小进度条',
  );

  // 还原按钮随控件显示，移动端与返回按钮同处顶部。
  const reset = Array.from(document.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === '还原画面',
  );
  assert(reset instanceof HTMLButtonElement, '缩放后可以还原画面');

  if (isMobile) {
    // 位置相对于真实视频容器检查，兼容不同窗口尺寸。
    const surface = document
      .querySelector('.player-surface')
      ?.getBoundingClientRect();
    const bounds = reset.getBoundingClientRect();
    assert(
      surface &&
        bounds.top - surface.top < 12 &&
        surface.right - bounds.right < 12,
      '移动端还原按钮位于右上角',
    );
  }

  reset.click();
  await nextTick();
  assert(
    video.style.getPropertyValue('transform') === 'scale(1)',
    '还原按钮恢复默认画面比例',
  );

  await pinch(video, 150);
  assert(
    getComputedStyle(controls).display !== 'none',
    '可见控件时缩放保持控件可见',
  );

  // 倍速菜单在播放器内部打开，打开期间保持控件可见。
  const rateButton = document.querySelector<HTMLButtonElement>(
    'button[data-control^="播放速度"]',
  );
  assert(rateButton, '控制栏提供倍速入口');
  if (isMobile) {
    rateButton.click();
  } else {
    rateButton.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    );
  }
  await until(
    () =>
      !!surface.querySelector(
        '[data-state="open"][data-slot="sheet-content"], [data-state="open"][data-slot="dropdown-menu-content"]',
      ),
    '倍速菜单打开',
  );

  const ratePanel = surface.querySelector(
    '[data-state="open"][data-slot="sheet-content"], [data-state="open"][data-slot="dropdown-menu-content"]',
  );
  assert(ratePanel, '倍速面板挂载在当前播放器内');
  await new Promise((resolve) => setTimeout(resolve, 2100));
  assert(
    getComputedStyle(controls).display !== 'none',
    '倍速菜单打开期间不自动隐藏控件',
  );

  const speedOption = Array.from(
    ratePanel.querySelectorAll<HTMLElement>(
      'button, [data-slot="dropdown-menu-item"]',
    ),
  ).find((option) => option.textContent?.trim() === '2.0x');
  assert(speedOption, '倍速面板提供两倍速');
  speedOption.click();
  await nextTick();
  assert(Number(video.playbackRate) === 2, '倍速选项直接更新当前媒体');
  assert(
    rateButton.dataset.control === '播放速度：2.0x',
    '倍速按钮同步共享媒体状态',
  );
  await until(
    () => !ratePanel.matches('[data-state="open"]'),
    '选择倍速后面板关闭',
  );

  // 相邻集和选集面板直接操作同一份影片状态。
  const nextButton = document.querySelector<HTMLButtonElement>(
    'button[data-control="下一集"]',
  );
  const previousButton = document.querySelector<HTMLButtonElement>(
    'button[data-control="上一集"]',
  );
  assert(nextButton && previousButton, '多集影片提供相邻集操作');
  nextButton.click();
  await nextTick();
  assert(
    selectedEpisodes.at(-1) === 1 && nextButton.disabled,
    '下一集更新当前选择并停用末集按钮',
  );
  previousButton.click();
  await nextTick();
  assert(
    selectedEpisodes.at(-1) === 0 && previousButton.disabled,
    '上一集恢复首集选择',
  );

  const episodesButton = document.querySelector<HTMLButtonElement>(
    'button[data-control="选集"]',
  );
  assert(episodesButton, '多集影片提供选集入口');
  episodesButton.click();
  await until(
    () =>
      !!surface.querySelector(
        '[data-slot="sheet-content"][data-state="open"] ol button',
      ),
    '选集面板打开',
  );

  const episodeButton = surface.querySelectorAll<HTMLButtonElement>(
    '[data-slot="sheet-content"][data-state="open"] ol button',
  )[1];
  assert(episodeButton, '选集面板展示第二集');
  episodeButton.click();
  await nextTick();
  assert(selectedEpisodes.at(-1) === 1, '选集面板更新同一份影片状态');
  await until(
    () =>
      !surface.querySelector('[data-slot="sheet-content"][data-state="open"]'),
    '选集后关闭面板',
  );

  // 滑块和快捷键都提交实际媒体时间。
  progress.value = '60';
  progress.dispatchEvent(new Event('input', { bubbles: true }));
  await nextTick();
  assert(
    mini.firstElementChild instanceof HTMLElement &&
      mini.firstElementChild.style.getPropertyValue('width') === '60%',
    '进度滑块同步小进度条',
  );

  window.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
  );
  window.dispatchEvent(
    new KeyboardEvent('keyup', { key: 'ArrowRight', bubbles: true }),
  );
  await nextTick();
  assert(progress.value === '65', '短按右方向键前进五秒');

  window.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
  );
  await new Promise((resolve) => setTimeout(resolve, 350));
  assert(
    Number(video.playbackRate) === 6,
    '长按右方向键临时使用当前倍速的三倍',
  );
  window.dispatchEvent(
    new KeyboardEvent('keyup', { key: 'ArrowRight', bubbles: true }),
  );
  await nextTick();
  assert(
    Number(video.playbackRate) === 2 && progress.value === '65',
    '松开长按恢复倍速并保留时间',
  );

  if (!isMobile) {
    // 音量提示由自身组件定时收起。
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    await nextTick();
    assert(
      surface
        .querySelector('.player-overlay > p')
        ?.textContent?.includes('音量：95%'),
      '音量快捷键显示媒体提示',
    );
    await new Promise((resolve) => setTimeout(resolve, 1100));
    await nextTick();
    assert(!surface.querySelector('.player-overlay > p'), '音量提示一秒后收起');
  }

  // 双击只切换播放，不执行等待中的单击。
  const beforeDoubleTap = playbackToggles;
  const controlsDisplay = getComputedStyle(controls).display;
  clickVideo(video);
  clickVideo(video);
  await new Promise((resolve) => setTimeout(resolve, 350));
  assert(playbackToggles === beforeDoubleTap + 1, '触屏双击只切换一次播放');
  assert(
    getComputedStyle(controls).display === controlsDisplay,
    '双击保留控件当前显隐',
  );

  // 离开后重新进入播放页，旧的轻触和长按都应结束。
  clickVideo(video);
  window.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
  );
  app.unmount();
  const ratesBeforeRemount = rateChanges.length;
  app = createPlayerApp();
  app.mount('#fixture');
  await new Promise((resolve) => setTimeout(resolve, 350));
  await nextTick();

  const remountedControls = document.querySelector('input[type="range"]')
    ?.parentElement?.parentElement?.parentElement;
  assert(
    remountedControls && getComputedStyle(remountedControls).display !== 'none',
    '重新进入时控件可见',
  );
  assert(rateChanges.length === ratesBeforeRemount, '卸载取消待执行的长按');

  const togglesBeforeRemount = playbackToggles;
  window.dispatchEvent(
    new KeyboardEvent('keydown', { key: ' ', bubbles: true }),
  );
  assert(
    playbackToggles === togglesBeforeRemount + 1,
    '重新进入后快捷键只有一份订阅',
  );
};

run()
  .then(() => {
    document.documentElement.dataset.result = 'passed';
    document
      .getElementById('status')
      ?.replaceChildren('播放器布局与缩放交互测试通过');
  })
  .catch((error: unknown) => {
    document.documentElement.dataset.result = 'failed';
    document.getElementById('status')?.replaceChildren(String(error));
  });
