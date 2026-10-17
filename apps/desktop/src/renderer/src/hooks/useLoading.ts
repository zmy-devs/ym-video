export default <T extends any[]>(fn: (...args: T) => Promise<void> | void) => {
  let loading = false;

  return async function (...args: T) {
    if (loading) return;

    loading = true;

    try {
      await fn(...args);
    } finally {
      loading = false;
    }
  };
};
