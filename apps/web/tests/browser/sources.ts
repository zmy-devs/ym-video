import { createApp, h, nextTick } from 'vue';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import SourceSwitcher from '../../src/components/source-switcher.vue';
import AppDialogs from '../../src/dialogs/index.vue';
import { eventBus } from '../../src/utils/event-bus';
import { useLibraryStore } from '../../src/stores/library';
import { getMovies } from '../../src/services/api';
import '../../src/styles/global.css';

// 真实组件通过模拟接口验证新增、分组、切源和持久化。
const run = async () => {
  // 测试完成后恢复当前浏览器原有偏好。
  const keys = ['ym-video:custom-sources', 'ym-video:source'];

  const previous = keys.map((key) => localStorage.getItem(key));

  const originalFetch = window.fetch;

  const requests: { url: URL; credentials?: RequestCredentials }[] = [];

  // 覆盖格式错误、跨域失败、HTTP 失败和响应读取中断。
  let mode: 'valid' | 'invalid' | 'network' | 'http' | 'json' | 'pending' =
    'valid';

  let release: (() => void) | undefined;

  // 读取模拟请求最新的释放函数，不使用之前请求的闭包。
  const releasePending = () => release?.();

  const pinia = createPinia();

  keys.forEach((key) => localStorage.removeItem(key));

  const library = useLibraryStore(pinia);

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { render: () => null } }],
  });

  await router.push('/category/9');

  window.fetch = async (input, options) => {
    // 所有请求都留在内存中，第三方域名只用于检查请求构造。
    const url = new URL(String(input), window.location.origin);

    requests.push({ url, credentials: options?.credentials });

    if (url.pathname === '/api/v1/proxy/sources') {
      return Response.json({
        sources: [{ id: 'baofeng', name: '平台测试源' }],
      });
    }

    if (url.host === 'custom.example') {
      if (mode === 'network') {
        throw new TypeError('Failed to fetch');
      }

      if (mode === 'http') {
        return new Response('', { status: 503 });
      }

      if (mode === 'json') {
        return new Response('<html>not json</html>');
      }

      if (mode === 'pending') {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      }

      if (mode === 'invalid') {
        return Response.json({
          class: [{ type_id: 'bad', type_pid: 0, type_name: '' }],
        });
      }
    }

    return Response.json({
      class: [{ type_id: 1, type_pid: 0, type_name: '电影' }],
      list: [
        {
          vod_id: 8,
          vod_name: '测试影片',
          vod_play_url: '第一集$https://media.example/a.m3u8',
        },
      ],
      pagecount: 1,
    });
  };

  // 挂载真实新增弹窗和菜单，验证组合后的 DOM 与交互。
  const app = createApp({ render: () => [h(SourceSwitcher), h(AppDialogs)] })
    .use(pinia)
    .use(router);

  app.mount('#fixture');

  try {
    await library.init();
    await openDialog();
    await submit();
    await until(() => Boolean(document.querySelector('#source-name-error')));
    assert(library.customSources.length === 0, '空名称不能添加');
    report('空字段校验，弹窗保持打开');

    fill('source-name', '我的测试源');
    fill('source-url', 'https://custom.example/api?token=test');
    mode = 'invalid';
    await submit();
    await until(() => Boolean(document.querySelector('#source-url-error')));
    assert(library.customSources.length === 0, '分类异常不能保存');
    assert(
      document.querySelector<HTMLInputElement>('#source-name')?.value ===
        '我的测试源',
      '失败保留输入',
    );
    report('分类格式错误时拒绝添加并保留输入');

    for (const responseMode of ['network', 'http', 'json'] as const) {
      mode = responseMode;
      await submit();
      await until(
        () =>
          !document.querySelector<HTMLButtonElement>(
            '[role="dialog"] button[type="submit"]',
          )?.disabled,
      );
      assert(
        Boolean(document.querySelector('#source-url-error')),
        '失败必须显示错误',
      );
      assert(library.customSources.length === 0, '接口失败不能保存');
    }
    report('网络、HTTP 和非 JSON 响应均拒绝添加');

    mode = 'valid';
    await submit();
    await until(
      () =>
        library.customSources.length === 1 &&
        !document.querySelector('[role="dialog"]'),
    );
    assert(
      document.activeElement?.id === 'source-switcher',
      '关闭后焦点回到菜单按钮',
    );
    const custom = library.customSources[0];
    assert(custom.name === '我的测试源', '添加后使用填写的备注');
    await openMenu();
    const menu = document.querySelector('[role="menu"]');
    if (!menu) {
      throw new Error('播放源菜单未打开');
    }
    assert(
      menu?.textContent?.includes('播放源') &&
        menu.textContent.includes('我的播放源'),
      '菜单区分两类源',
    );
    assert(
      menu.querySelectorAll('[role="separator"]').length === 2,
      '两类源之间及新增入口之前有分割线',
    );
    const item = [
      ...menu.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    ].find((entry) => entry.textContent?.includes(custom.name));
    item?.click();
    await until(
      () => library.selected === custom.id && !library.categoryLoading,
    );
    assert(
      router.currentRoute.value.path === '/category',
      '切源清除旧分类路由',
    );
    assert(library.categories[0]?.name === '电影', '切源后显示新分类');
    report('添加成功、菜单分组分隔、选择后切换分类并清理旧路由');

    const movies = await getMovies(custom, { t: 1, wd: '测试', pg: 2 });
    const detail = await getMovies(custom, { ids: 8 });
    assert(
      movies.movies[0]?.sourceId === custom.id &&
        detail.movies[0]?.episodes.length === 1,
      '搜索和详情仍使用自定义源 ID',
    );
    const request = [...requests]
      .reverse()
      .find((entry) => entry.url.searchParams.get('wd') === '测试');
    assert(
      request?.url.host === 'custom.example' &&
        request.url.searchParams.get('token') === 'test',
      '直连地址保留原始接口参数',
    );
    assert(
      request?.credentials === 'omit' &&
        request.url.searchParams.get('ac') === 'detail',
      '第三方请求不携带本站会话',
    );
    report('自定义源列表、分类、搜索、详情与会话隔离');

    await openDialog();
    fill('source-name', '重复源');
    fill('source-url', 'https://custom.example/api?token=test#ac');
    const count = requests.length;
    await submit();
    await until(() => Boolean(document.querySelector('#source-url-error')));
    assert(
      requests.length === count && library.customSources.length === 1,
      '重复地址无需请求且不能重复保存',
    );
    report('重复地址规范化后拦截');

    fill('source-url', 'https://custom.example/slow');
    mode = 'pending';
    await submit();
    await until(() => Boolean(release));
    assert(
      document.querySelector<HTMLButtonElement>(
        '[role="dialog"] button[type="submit"]',
      )?.disabled,
      '验证期间禁止重复提交',
    );
    document.querySelector<HTMLElement>('[data-slot="dialog-close"]')?.click();
    await until(() => !document.querySelector('[role="dialog"]'));
    mode = 'valid';
    release?.();
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert(library.customSources.length === 1, '关闭弹窗后返回的请求不能保存');
    report('验证中关闭取消保存，重复提交被禁用');

    const restored = useLibraryStore(createPinia());
    await restored.init();
    assert(
      restored.customSources[0]?.id === custom.id &&
        restored.selected === custom.id,
      '刷新后恢复播放源与选择',
    );
    assert(restored.sources.length === 2, '恢复后仍包含平台源和自定义源');
    restored.$dispose();
    report('重新创建数据层后恢复自定义源和当前选择');

    await openMenu();
    const editButton = document.querySelector<HTMLButtonElement>(
      `[aria-label="编辑播放源：${custom.name}"]`,
    );
    assert(
      editButton && !editButton.closest('[role="menuitem"]'),
      '编辑按钮不能嵌套在选源菜单项内',
    );
    // 沿用当前 15 像素操作图标，键盘可进入两种操作。
    const row = editButton?.closest('[data-source-row]');

    assert(
      [...(row?.querySelectorAll('button svg') ?? [])].every(
        (icon) =>
          icon.getBoundingClientRect().width === 15 &&
          icon.getBoundingClientRect().height === 15,
      ),
      '编辑和删除图标均为 15px',
    );
    row?.querySelector<HTMLElement>('[role="menuitem"]')?.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true,
      }),
    );
    assert(document.activeElement === editButton, '右方向键进入编辑按钮');
    editButton?.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true,
      }),
    );
    assert(
      document.activeElement?.getAttribute('aria-label') ===
        `删除播放源：${custom.name}`,
      '右方向键进入删除按钮',
    );
    editButton?.click();
    await until(() => Boolean(document.querySelector('#source-name')));
    assert(
      document.querySelector<HTMLInputElement>('#source-name')?.value ===
        custom.name,
      '编辑回填名称',
    );
    assert(
      document.querySelector<HTMLInputElement>('#source-url')?.value ===
        custom.url,
      '编辑回填 URL',
    );
    eventBus.emit('source:show');
    await nextTick();
    assert(
      document.querySelectorAll('[role="dialog"]').length === 1,
      '重复事件不能创建第二个弹窗',
    );
    fill('source-name', '修改后的源');
    fill('source-url', 'https://custom.example/edited');
    mode = 'invalid';
    await submit();
    await until(() => Boolean(document.querySelector('#source-url-error')));
    assert(library.customSources[0]?.name === custom.name, '验证失败保留原源');
    mode = 'valid';
    await submit();
    await until(() => !document.querySelector('[role="dialog"]'));
    assert(
      library.customSources[0]?.id === custom.id &&
        library.selected === custom.id,
      '编辑不改变 ID 或选择',
    );
    assert(
      library.source?.url === 'https://custom.example/edited',
      '当前源同步更新接口',
    );
    report('编辑回填、验证失败保留原源、保存保留 ID，重复打开仍为单例');

    await library.addSource(
      '另一个源',
      'https://custom.example/another',
      new AbortController().signal,
    );
    eventBus.emit('source:show', custom.id);
    await until(() => Boolean(document.querySelector('#source-name')));
    fill('source-url', 'https://custom.example/another');
    const beforeDuplicate = requests.length;
    await submit();
    await until(() => Boolean(document.querySelector('#source-url-error')));
    assert(
      requests.length === beforeDuplicate &&
        library.customSources[0]?.url === 'https://custom.example/edited',
      '编辑不能覆盖其他源的地址',
    );
    await router.push('/overview');
    await until(() => !document.querySelector('[role="dialog"]'));
    report('编辑拒绝其他源的重复地址，切页关闭根弹窗');

    await openMenu();
    document
      .querySelector<HTMLElement>(`[aria-label="删除播放源：修改后的源"]`)
      ?.click();
    await until(() => Boolean(document.querySelector('[role="alertdialog"]')));
    assert(library.customSources.length === 2, '打开确认框不直接删除');
    [
      ...document.querySelectorAll<HTMLButtonElement>(
        '[role="alertdialog"] button',
      ),
    ]
      .find((button) => button.textContent === '取消')
      ?.click();
    await until(() => !document.querySelector('[role="alertdialog"]'));
    assert(library.customSources.length === 2, '取消保留播放源');
    assert(
      document.activeElement?.id === 'source-switcher',
      '取消删除后恢复菜单入口焦点',
    );
    report('删除前确认，取消保留原源并恢复焦点');

    await router.push('/category/9');
    await openMenu();
    document
      .querySelector<HTMLElement>('[aria-label="删除播放源：修改后的源"]')
      ?.click();
    await until(() => Boolean(document.querySelector('[role="alertdialog"]')));
    document
      .querySelector<HTMLElement>(
        '[role="alertdialog"] [data-variant="destructive"]',
      )
      ?.click();
    await until(() => !document.querySelector('[role="alertdialog"]'));
    assert(
      !library.customSources.some((item) => item.id === custom.id),
      '确认才删除指定源',
    );
    assert(
      library.selected === 'baofeng' &&
        router.currentRoute.value.path === '/category',
      '删除当前源回退平台源并清理分类路由',
    );
    assert(
      !localStorage.getItem('ym-video:custom-sources')?.includes(custom.id),
      '删除同步持久化',
    );
    report('确认删除当前源后回退平台源，清理路由并持久化');

    eventBus.emit('source:show', library.customSources[0]?.id);
    await until(() => Boolean(document.querySelector('#source-name')));
    fill('source-name', '迟到的编辑');
    fill('source-url', 'https://custom.example/delayed');
    mode = 'pending';
    release = undefined;
    await submit();
    await until(() => Boolean(release));
    await router.push('/history');
    await until(() => !document.querySelector('[role="dialog"]'));
    mode = 'valid';
    releasePending();
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert(
      library.customSources[0]?.name === '另一个源',
      '切页取消的编辑不能写回旧结果',
    );
    report('切页取消编辑请求，迟到结果不能写入');

    // 确认失败保留同一个目标，重试完成后才能关闭。
    let attempts = 0;
    eventBus.emit('confirm:show', {
      title: '测试失败重试',
      description: '只操作内存数据。',
      onConfirm: () => {
        attempts += 1;
        if (attempts === 1) {
          throw new Error('模拟失败');
        }
      },
    });
    await until(() => Boolean(document.querySelector('[role="alertdialog"]')));
    document
      .querySelector<HTMLElement>(
        '[role="alertdialog"] [data-variant="destructive"]',
      )
      ?.click();
    await until(() =>
      Boolean(document.querySelector('[role="alertdialog"] [role="alert"]')),
    );
    assert(
      document
        .querySelector('[role="alertdialog"]')
        ?.textContent?.includes('模拟失败'),
      '错误显示在确认框内',
    );
    document
      .querySelector<HTMLElement>(
        '[role="alertdialog"] [data-variant="destructive"]',
      )
      ?.click();
    await until(() => !document.querySelector('[role="alertdialog"]'));
    assert(attempts === 2, '同一确认框可重试');
    report('统一确认框失败反馈和重试');
  } finally {
    release?.();
    app.unmount();
    library.$dispose();
    window.fetch = originalFetch;
    keys.forEach((key, index) => {
      const value = previous[index];
      if (value === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value);
      }
    });
  }
};

// 通过真实键盘事件打开菜单，保持 Reka 的焦点行为。
const openMenu = async () => {
  document.querySelector<HTMLElement>('#source-switcher')?.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    }),
  );
  await until(() => Boolean(document.querySelector('[role="menu"]')));
};

// 从菜单入口打开真实新增弹窗。
const openDialog = async () => {
  await openMenu();
  [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')]
    .find((item) => item.textContent?.includes('添加播放源'))
    ?.click();
  await until(() => Boolean(document.querySelector('#source-name')));
};

// 输入事件按原生表单方式通知 v-model。
const fill = (id: string, value: string) => {
  const input = document.getElementById(id);
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`缺少字段：${id}`);
  }
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

// 使用 submit 同时覆盖回车和确定按钮对应的提交路径。
const submit = async () => {
  await nextTick();
  document
    .querySelector<HTMLFormElement>('[role="dialog"] form')
    ?.requestSubmit();
};

// 等待实际异步状态，而不是依赖接口固定响应速度。
const until = async (ready: () => boolean) => {
  const deadline = Date.now() + 5000;
  await nextTick();
  while (!ready()) {
    if (Date.now() > deadline) {
      throw new Error('等待播放源状态超时');
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

// 断言失败立即终止当前场景。
const assert = (condition: unknown, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

// 每个场景结果显示在页面，便于人工复查。
const report = (message: string) => {
  const item = document.createElement('li');
  item.textContent = `通过：${message}`;
  document.querySelector('#results')?.append(item);
};

// 人工触发测试，不在普通业务页面运行。
document
  .querySelector<HTMLButtonElement>('#run')
  ?.addEventListener('click', (event) => {
    const button = event.currentTarget;
    if (button instanceof HTMLButtonElement) {
      button.disabled = true;
    }
    run().then(
      () => {
        const status = document.querySelector('#status');
        if (status) {
          status.textContent = `全部通过（${document.querySelectorAll('#results li').length} 个场景）`;
        }
      },
      (cause: unknown) => {
        const status = document.querySelector('#status');
        if (status) {
          status.textContent = `失败：${cause instanceof Error ? cause.message : String(cause)}`;
        }
      },
    );
  });
