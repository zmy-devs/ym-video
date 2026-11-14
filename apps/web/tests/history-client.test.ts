import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyHistory } from '@ym-video/history';
import type { HistoryOperation } from '@ym-video/history';
import {
  createHistoryClient,
  HistoryServiceError,
} from '../src/services/history-client.ts';
import {
  cachedHistorySchema,
  queuedOperationSchema,
} from '../src/schemas/history.ts';

test('云端暂时不可用和网络中断后，自动重试读取同一账号', async () => {
  const snapshot = emptyHistory('reader');
  let attempts = 0;
  const client = createHistoryClient(async (input, init) => {
    assert.equal(input, '/api/v1/history');
    assert.equal(init?.credentials, 'include');
    attempts++;
    if (attempts === 1) {
      return new Response('暂时不可用', { status: 503 });
    }
    if (attempts === 2) {
      throw new TypeError('Failed to fetch');
    }
    return Response.json(snapshot);
  });
  assert.deepEqual(
    await client.fetchHistory('reader', new AbortController().signal),
    snapshot,
  );
  assert.equal(attempts, 3);
});

test('同步冲突会重传完全相同的请求体和操作标识', async () => {
  const operation: HistoryOperation = {
    id: 'clear-1',
    at: 1,
    epoch: 'initial',
    type: 'clear',
  };
  const bodies: (BodyInit | null | undefined)[] = [];
  const client = createHistoryClient(async (input, init) => {
    assert.equal(input, '/api/v1/history/sync');
    assert.equal(init?.method, 'POST');
    bodies.push(init?.body);
    if (bodies.length === 1) {
      return Response.json({ code: 'HISTORY_CONFLICT' }, { status: 409 });
    }
    return Response.json(emptyHistory('writer'));
  });
  await client.syncHistory('writer', [operation], new AbortController().signal);
  assert.equal(bodies.length, 2);
  assert.equal(bodies[0], bodies[1]);
  assert.deepEqual(JSON.parse(String(bodies[0])), {
    ownerId: 'writer',
    operations: [operation],
  });
});

test('超时重试使用新的八秒期限，不继承上次已取消的信号', async (context) => {
  const deadlines: AbortController[] = [];
  const signals: (AbortSignal | null | undefined)[] = [];
  context.mock.method(AbortSignal, 'timeout', (milliseconds: number) => {
    assert.equal(milliseconds, 8000);
    const deadline = new AbortController();
    deadlines.push(deadline);
    return deadline.signal;
  });
  const client = createHistoryClient(async (_input, init) => {
    signals.push(init?.signal);
    if (signals.length === 1) {
      deadlines[0].abort(new DOMException('超时', 'TimeoutError'));
      init?.signal?.throwIfAborted();
    }
    return Response.json(emptyHistory('timeout-reader'));
  });
  await client.fetchHistory('timeout-reader', new AbortController().signal);
  assert.equal(signals.length, 2);
  assert.notEqual(signals[0], signals[1]);
  assert.equal(signals[0]?.aborted, true);
  assert.equal(signals[1]?.aborted, false);
});

test('账号和请求错误直接结束上传，取消后不再重传', async () => {
  for (const status of [400, 401, 403, 409]) {
    let attempts = 0;
    const client = createHistoryClient(async () => {
      attempts++;
      return Response.json({ code: 'ACCOUNT_CHANGED' }, { status });
    });
    await assert.rejects(
      client.syncHistory('writer', [], new AbortController().signal),
      HistoryServiceError,
    );
    assert.equal(attempts, 1);
  }

  const controller = new AbortController();
  let attempts = 0;
  const client = createHistoryClient(async () => {
    attempts++;
    controller.abort(new Error('已取消上传'));
    throw new Error('连接中断');
  });
  await assert.rejects(
    client.syncHistory('writer', [], controller.signal),
    /已取消上传/,
  );
  assert.equal(attempts, 1);
});

test('返回快照在网络入口校验账号和结构，失败不重试', async () => {
  for (const value of [emptyHistory('other'), { ownerId: 'reader' }]) {
    let attempts = 0;
    const client = createHistoryClient(async () => {
      attempts++;
      return Response.json(value);
    });
    await assert.rejects(
      client.fetchHistory('reader', new AbortController().signal),
      (error) =>
        error instanceof HistoryServiceError &&
        error.type === 'invalid-response',
    );
    assert.equal(attempts, 1);
  }
});

test('本机历史读取边界验证账号归属、队列键和持久化序号', () => {
  assert.equal(
    cachedHistorySchema.safeParse({
      ownerId: 'reader',
      snapshot: emptyHistory('other'),
    }).success,
    false,
  );
  const queued = {
    key: 'reader:clear-1',
    ownerId: 'reader',
    order: 0,
    operation: { id: 'clear-1', at: 1, epoch: 'initial', type: 'clear' },
  };
  assert.equal(queuedOperationSchema.safeParse(queued).success, true);
  assert.equal(
    queuedOperationSchema.safeParse({ ...queued, key: 'other:clear-1' })
      .success,
    false,
  );
  assert.equal(
    queuedOperationSchema.safeParse({ ...queued, order: -1 }).success,
    false,
  );
});
