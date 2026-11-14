import { createApp, h, nextTick } from 'vue';
import { TooltipProvider } from '@ym-video/ui/components/tooltip';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import SourceDialog from '../../src/components/dialogs/source-dialog.vue';
import MovieCard from '../../src/components/movie-card/index.vue';
import { useLibraryStore } from '../../src/stores/library-store';
import { eventBus } from '../../src/utils/event-bus';
import type { HistoryEntry } from '@ym-video/history';
import '../../src/styles/global.css';

const assert = (value: unknown, message: string) => {
  if (!value) {
    throw new Error(message);
  }
};
const delay = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
const until = async (check: () => boolean) => {
  const deadline = Date.now() + 5000;
  while (!check()) {
    assert(Date.now() < deadline, '等待界面状态超时');
    await delay(10);
  }
  await nextTick();
};

const run = async () => {
  localStorage.clear();
  const pinia = createPinia();
  setActivePinia(pinia);
  const library = useLibraryStore();
  library.platformSources = [
    { id: 'test', name: '测试源', url: 'https://example.com/api' },
  ];
  library.selected = 'test';
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/category', component: { render: () => null } },
      { path: '/player/:sourceId/:vodId', component: { render: () => null } },
    ],
  });
  await router.push('/category');
  const entry: HistoryEntry = {
    id: 'test:1',
    sourceId: 'test',
    vodId: '1',
    name: '测试影片',
    pic: '',
    year: '2026',
    area: '',
    lang: '',
    category: '',
    remarks: '',
    episodes: [{ label: '第一集', url: 'https://example.com/1.m3u8' }],
    episode: 0,
    watchedAt: 1,
    progress: {},
  };
  let presses = 0;
  const app = createApp({
    render: () =>
      h(TooltipProvider, () => [
        h(SourceDialog),
        h(MovieCard, {
          movie: entry,
          entry,
          mobileActions: true,
          onLongPress: () => presses++,
        }),
      ]),
  })
    .use(pinia)
    .use(router);
  let requests = 0;
  let hold = false;
  let release: (() => void) | undefined;
  let signal: AbortSignal | null | undefined;
  const fetch = window.fetch;
  window.fetch = async (_input, init) => {
    requests++;
    signal = init?.signal;
    if (hold) {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    }
    return new Response(
      JSON.stringify({
        class: [{ type_id: 1, type_pid: 0, type_name: '电影' }],
      }),
    );
  };
  app.mount('#fixture');
  try {
    eventBus.emit('source:show');
    await until(
      () => !!document.querySelector('[data-slot="dialog-content"] input'),
    );
    const fields = () => [
      ...document.querySelectorAll<HTMLInputElement>(
        '[data-slot="dialog-content"] input',
      ),
    ];
    const fill = (index: number, value: string) => {
      const input = fields()[index];
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const submit = () =>
      document
        .querySelector('form')
        ?.dispatchEvent(
          new Event('submit', { bubbles: true, cancelable: true }),
        );
    submit();
    await until(() => !!document.body.textContent?.includes('名称需为'));
    assert(
      requests === 0 && document.body.textContent?.includes('名称需为'),
      '空表单由 Zod 拦截',
    );
    fill(0, ' 我的源 ');
    fill(1, 'file:///api');
    await nextTick();
    submit();
    await until(() => !!document.body.textContent?.includes('HTTP 或 HTTPS'));
    assert(
      requests === 0 && document.body.textContent?.includes('HTTP 或 HTTPS'),
      '无效协议不发请求',
    );
    fill(1, ' https://EXAMPLE.com/api?token=abc&pg=2#top ');
    await nextTick();
    submit();
    await until(() => library.customSources.length === 1);
    assert(
      library.customSources[0].name === '我的源' &&
        library.customSources[0].url === 'https://example.com/api?token=abc',
      '表单规范化后保存',
    );
    await delay(200);
    eventBus.emit('source:show');
    await until(() => fields().length === 2);
    fill(0, '取消的源');
    fill(1, 'https://other.example/api');
    await nextTick();
    hold = true;
    submit();
    await until(() => requests === 2);
    eventBus.emit('dialogs:close');
    await nextTick();
    assert(signal?.aborted, '关闭弹窗取消接口验证');
    release?.();
    await delay(100);
    assert(library.customSources.length === 1, '取消请求的迟到结果不会写入');

    const card = document.querySelector('article')?.parentElement;
    const link = card?.querySelector('a');
    assert(card && link, '影片卡片已挂载');
    const pointer = (type: string, x = 100) =>
      card?.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          pointerType: 'touch',
          button: 0,
          clientX: x,
          clientY: 100,
        }),
      );
    pointer('pointerdown');
    await delay(500);
    pointer('pointerup');
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    link?.dispatchEvent(click);
    assert(
      presses === 1 &&
        click.defaultPrevented &&
        router.currentRoute.value.path === '/category',
      '长按一次并拦截随后的链接点击',
    );
    pointer('pointerdown');
    pointer('pointermove', 125);
    await delay(500);
    pointer('pointerup', 125);
    assert(presses === 1, '滚动移动时取消长按');
    pointer('pointerdown');
    pointer('pointercancel');
    await delay(500);
    assert(presses === 1, '系统取消触摸时不触发长按');
    pointer('pointerdown');
    pointer('pointerup');
    link?.click();
    await until(() => router.currentRoute.value.path === '/player/test/1');
  } finally {
    app.unmount();
    library.$dispose();
    window.fetch = fetch;
  }
};

run()
  .then(() => {
    document.documentElement.dataset.result = 'passed';
    const status = document.getElementById('status');
    if (status) {
      status.textContent = '播放源表单、请求取消与卡片长按验证通过';
    }
  })
  .catch((error: unknown) => {
    document.documentElement.dataset.result = 'failed';
    const status = document.getElementById('status');
    if (status) {
      status.textContent =
        error instanceof Error ? (error.stack ?? error.message) : String(error);
    }
    console.error(error);
  });
