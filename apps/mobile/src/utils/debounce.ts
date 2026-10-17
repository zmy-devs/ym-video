export default <T extends (...args: any[]) => void>(fn: T, delay = 300) => {
  let timer: number | undefined;

  return function (...args: Parameters<T>) {
    if (timer) {
      clearTimeout(timer);
    }

    timer = window.setTimeout(() => {
      fn.apply(null, args);
    }, delay);
  };
};
