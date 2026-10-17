import { useRef } from "react";

export default function <T extends any[]>(
  fn: (...args: T) => Promise<void> | void
) {
  const loading = useRef(false);

  return async function (...args: T) {
    if (loading.current) return;

    loading.current = true;

    try {
      await fn(...args);
    } finally {
      loading.current = false;
    }
  };
}
