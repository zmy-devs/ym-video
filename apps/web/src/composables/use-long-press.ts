import type { Ref } from 'vue';
import { onLongPress, useEventListener } from '@vueuse/core';

// VueUse 管理长按计时和移动容差，卡片只接收确认后的操作。
export const useLongPress = (
  target: Ref<HTMLElement | null>,
  press: () => void,
) => {
  // 本轮长按决定是否拦截随后产生的链接点击。
  let triggered = false;
  let cancelled = false;

  useEventListener(target, 'pointerdown', () => {
    triggered = false;
    cancelled = false;
  });
  useEventListener(target, 'pointercancel', () => {
    cancelled = true;
  });

  onLongPress(
    target,
    (event) => {
      if (event.button === 0 && !cancelled) {
        triggered = true;
        press();
      }
    },
    { delay: 450, distanceThreshold: 10 },
  );

  useEventListener(
    target,
    'click',
    (event) => {
      if (triggered) {
        event.preventDefault();
        event.stopPropagation();
        triggered = false;
      }
    },
    { capture: true },
  );
};
