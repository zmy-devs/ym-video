import assert from 'node:assert/strict';
import { test } from 'node:test';
import { retryRequest } from '@ym-video/account/request-retry';

test('请求失败后按配置次数重试，成功后返回结果', async () => {
  const controller = new AbortController();
  let attempts = 0;
  const result = await retryRequest(
    async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('连接中断');
      }
      return '已同步';
    },
    controller.signal,
    2,
    { minTimeout: 0 },
  );
  assert.equal(result, '已同步');
  assert.equal(attempts, 3);
});

test('重试次数耗尽后保留最终错误，永久失败可以停止重试', async () => {
  const controller = new AbortController();
  const failure = new Error('连接失败');
  let attempts = 0;
  const request = async () => {
    attempts++;
    throw failure;
  };
  await assert.rejects(
    retryRequest(request, controller.signal, 2, { minTimeout: 0 }),
    (error) => error === failure,
  );
  assert.equal(attempts, 3);

  attempts = 0;
  await assert.rejects(
    retryRequest(request, controller.signal, 5, { shouldRetry: () => false }),
    (error) => error === failure,
  );
  assert.equal(attempts, 1);
});

test('取消会结束退避等待，已取消的请求不会再次执行', async () => {
  const controller = new AbortController();
  const reason = new Error('已离开页面');
  let attempts = 0;
  const finished = assert.rejects(
    retryRequest(async () => {
      attempts++;
      throw new Error('网络不通');
    }, controller.signal),
    (error) => error === reason,
  );
  await new Promise((resolve) => setTimeout(resolve, 20));
  controller.abort(reason);
  await finished;
  assert.equal(attempts, 1);

  await assert.rejects(
    retryRequest(async () => attempts++, controller.signal),
    (error) => error === reason,
  );
  assert.equal(attempts, 1);
});

test('取消期间迟到的成功结果不会提交', async () => {
  const controller = new AbortController();
  const reason = new Error('账号已退出');
  let finish: (() => void) | undefined;
  const finished = assert.rejects(
    retryRequest(
      () => new Promise<void>((resolve) => (finish = resolve)),
      controller.signal,
    ),
    (error) => error === reason,
  );
  controller.abort(reason);
  finish?.();
  await finished;
});
