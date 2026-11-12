import assert from 'node:assert/strict';
import { test } from 'node:test';
import { effectScope } from 'vue';
import { useRequest } from '../src/composables/use-request.ts';

test('替换请求会中止旧信号，旧任务完成不会释放新任务', async () => {
  const scope = effectScope();
  const signals: AbortSignal[] = [];
  const finish: (() => void)[] = [];
  const request = scope.run(() =>
    useRequest((signal) => {
      signals.push(signal);
      return new Promise<void>((resolve) => finish.push(resolve));
    }),
  );
  assert.ok(request);
  try {
    const first = request.execute();
    const second = request.execute();
    assert.equal(signals[0].aborted, true);
    assert.equal(signals[1].aborted, false);
    finish[0]();
    await first;
    assert.equal(request.task.value, second);
    assert.equal(request.pending.value, true);
    finish[1]();
    await second;
    assert.equal(request.pending.value, false);
  } finally {
    scope.stop();
  }
});

test('取消与销毁作用域都会终止当前请求，失败后可以重新执行', async () => {
  const scope = effectScope();
  const signals: AbortSignal[] = [];
  const request = scope.run(() =>
    useRequest(async (signal, fail: boolean) => {
      signals.push(signal);
      if (fail) {
        throw new Error('网络错误');
      }
      return new Promise<void>(() => {});
    }),
  );
  assert.ok(request);
  await assert.rejects(request.execute(true), /网络错误/);
  assert.equal(request.pending.value, false);
  request.execute(false);
  request.cancel();
  assert.equal(signals[1].aborted, true);
  assert.equal(request.pending.value, false);
  request.execute(false);
  scope.stop();
  assert.equal(signals[2].aborted, true);
  assert.equal(request.pending.value, false);
});
