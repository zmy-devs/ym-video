import { computed, onScopeDispose, ref } from 'vue';
import { onLongPress, useEventListener, useSwipe } from '@vueuse/core';
import type { useMedia } from './use-media.ts';

// 只监听视频画面，按钮、进度条和选集面板使用各自的触摸交互。
export const useGestures = (
  media: ReturnType<typeof useMedia>,
  getBrightness: () => number | undefined,
  setBrightness: (value: number) => void,
  keepControls: () => void,
  scheduleHide: () => void,
) => {
  const gestureLabel = ref('');
  const scale = ref(1);
  const suppressClick = ref(false);
  let start = { time: 0, volume: 1, brightness: 0.5 };

  // 当前手势方向锁定后，持续使用同一种操作。
  const mode = ref<'seek' | 'volume' | 'brightness' | 'zoom' | null>(null);

  // 横向滑动只预览目标时间，松手后提交。
  const seekTime = ref(0);

  // 进度条直接展示横向手势预览，其他手势不提供预览值。
  const seekPreview = computed(() =>
    mode.value === 'seek' ? seekTime.value : undefined,
  );

  // 手势调音量时持续复用播放器的音量提示。
  const adjustingVolume = computed(() => mode.value === 'volume');

  let heldRate: number | undefined;
  let pinchDistance = 0;

  const releaseRate = () => {
    if (heldRate !== undefined) {
      media.setRate(heldRate);
      heldRate = undefined;
    }
  };

  const finish = () => {
    releaseRate();
    mode.value = null;
    scale.value = 1;
    pinchDistance = 0;
    gestureLabel.value = '';
    scheduleHide();
  };

  useEventListener(media.video, 'pointerdown', () => {
    suppressClick.value = false;
  });

  // 横向滑动预览进度，左右半屏纵向分别调亮度和音量。
  const swipe = useSwipe(media.video, {
    threshold: 12,
    passive: false,
    onSwipeStart: () => {
      start = {
        time: media.currentTime.value,
        volume: media.volume.value,
        brightness: getBrightness() ?? 0.5,
      };
      mode.value = null;
    },
    onSwipe: (event) => {
      const element = media.video.value;
      const bounds = element?.getBoundingClientRect();
      if (
        !bounds ||
        event.touches.length !== 1 ||
        heldRate !== undefined ||
        mode.value === 'zoom'
      ) {
        return;
      }

      event.preventDefault();
      suppressClick.value = true;
      keepControls();

      const deltaX = swipe.coordsEnd.x - swipe.coordsStart.x;
      const deltaY = swipe.coordsStart.y - swipe.coordsEnd.y;
      if (!mode.value) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          mode.value = 'seek';
        } else {
          mode.value =
            swipe.coordsStart.x < bounds.left + bounds.width / 2
              ? 'brightness'
              : 'volume';
        }
      }

      if (mode.value === 'seek') {
        seekTime.value = Math.max(
          0,
          Math.min(
            media.duration.value,
            start.time + (deltaX / bounds.width) * media.duration.value,
          ),
        );
        return;
      }

      if (mode.value === 'brightness') {
        const value = Math.max(
          0,
          Math.min(1, start.brightness + deltaY / bounds.height),
        );
        setBrightness(value);
        gestureLabel.value = `亮度：${Math.round(value * 100)}%`;
        return;
      }

      media.setVolume(start.volume + deltaY / bounds.height);
    },
    onSwipeEnd: (event) => {
      if (mode.value === 'seek' && event.type !== 'touchcancel') {
        media.seek(seekTime.value);
      }
      finish();
    },
  });

  // 长按画面临时三倍速，松手恢复。
  onLongPress(
    media.video,
    (event) => {
      if (
        event.pointerType === 'mouse' ||
        mode.value ||
        heldRate !== undefined
      ) {
        return;
      }

      heldRate = media.rate.value;
      media.setRate(heldRate * 3);
      suppressClick.value = true;
      gestureLabel.value = `${media.rate.value} 倍速播放中…`;
      keepControls();
    },
    {
      delay: 300,
      distanceThreshold: 12,
      onMouseUp: () => {
        releaseRate();
        gestureLabel.value = '';
        scheduleHide();
      },
    },
  );

  // 双指距离决定画面临时缩放，松手恢复完整画面。
  useEventListener(
    media.video,
    ['touchstart', 'touchmove'],
    (event) => {
      const [first, second] = event.touches;
      if (!first || !second) {
        return;
      }

      event.preventDefault();
      releaseRate();
      mode.value = 'zoom';
      suppressClick.value = true;
      const distance = Math.hypot(
        first.clientX - second.clientX,
        first.clientY - second.clientY,
      );
      if (!pinchDistance) {
        pinchDistance = distance;
      }
      scale.value = Math.max(1, Math.min(2.5, distance / pinchDistance));
    },
    { passive: false },
  );
  useEventListener(media.video, ['touchend', 'touchcancel'], finish);
  useEventListener(window, 'blur', finish);
  onScopeDispose(releaseRate);

  return { gestureLabel, scale, suppressClick, seekPreview, adjustingVolume };
};
