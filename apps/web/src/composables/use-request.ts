import { computed, onScopeDispose, shallowRef } from 'vue';

// 每次执行替换上一次请求，调用方只管理结果和业务状态。
export const useRequest = <Args extends unknown[], Result>(
  request: (signal: AbortSignal, ...args: Args) => Promise<Result>,
) => {
  // 持有当前调用的 Promise，支持合并同一轮请求。
  const task = shallowRef<Promise<Result>>();

  // 等待状态随任务创建、取消与结束更新。
  const pending = computed(() => !!task.value);

  // 取消信号只在请求组合式函数内部维护。
  let controller: AbortController | undefined;

  // 取消时立即释放当前任务，旧任务完成后不能清理新任务。
  const cancel = () => {
    controller?.abort();
    controller = undefined;
    task.value = undefined;
  };

  // 开始新任务并在完成时仅释放自己的引用。
  const execute = (...args: Args) => {
    cancel();
    controller = new AbortController();

    // 捕获当前任务，避免迟到回调清理后续请求。
    const current = request(controller.signal, ...args);
    task.value = current;

    // 成功与失败沿用同一套任务释放流程。
    const finish = () => {
      if (task.value === current) {
        task.value = undefined;
        controller = undefined;
      }
    };
    current.then(finish, finish);
    return current;
  };

  onScopeDispose(cancel);
  return { execute, cancel, pending, task };
};
