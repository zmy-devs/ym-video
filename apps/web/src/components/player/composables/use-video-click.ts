import { watch, type Ref } from 'vue';
import { useEventListener, useTimeoutFn } from '@vueuse/core';
import type { PlayerController } from '../types.ts';
import type { useControls } from './use-controls.ts';
import { isMobile } from '@/platform';

// 两次轻触在相同时间窗口和位置范围内视为双击。
const doubleTapDelay = 300;
const doubleTapDistance = 32;

// 区分画面轻触、双击和手势结束后的合成点击。
export const useVideoClick = (
  player: PlayerController,
  controls: ReturnType<typeof useControls>,
  suppressClick: Ref<boolean>,
) => {
  // 等待双击判定的首次轻触。
  let lastTap: { time: number; x: number; y: number } | undefined;

  // 单击等待结束后才切换控件，卸载时自动停止。
  const tap = useTimeoutFn(
    () => {
      lastTap = undefined;
      controls.toggle();
    },
    doubleTapDelay,
    { immediate: false },
  );

  // 操作控件或开始手势时取消待判定的轻触。
  const cancelTap = () => {
    tap.stop();
    lastTap = undefined;
  };

  useEventListener(
    controls.element,
    ['pointerdown', 'pointerenter', 'pointermove', 'focusin'],
    cancelTap,
  );

  watch(
    suppressClick,
    (value) => {
      if (value) {
        cancelTap();
      }
    },
    { flush: 'sync' },
  );

  // 播放按钮与双击共用入口，取消尚未完成的单击。
  const handleTogglePlay = () => {
    cancelTap();
    return player.togglePlay();
  };

  // 触屏单击切换控件、双击切换播放，鼠标单击切换播放。
  const handleVideoClick = (event: MouseEvent) => {
    if (suppressClick.value) {
      cancelTap();
      return;
    }

    if (
      isMobile ||
      (event instanceof PointerEvent && event.pointerType === 'touch')
    ) {
      if (
        lastTap &&
        event.timeStamp - lastTap.time <= doubleTapDelay &&
        Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) <=
          doubleTapDistance
      ) {
        return handleTogglePlay();
      }

      lastTap = { time: event.timeStamp, x: event.clientX, y: event.clientY };
      tap.start();
      return;
    }

    return player.togglePlay();
  };

  return { handleVideoClick, handleTogglePlay };
};
