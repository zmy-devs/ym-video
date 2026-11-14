import { onScopeDispose, ref } from 'vue';
import { useEventListener, useTimeoutFn } from '@vueuse/core';
import type { useMedia } from './use-media.ts';

// 右方向键长按的判定时间。
const holdDelay = 300;

// 播放器处理的快捷键集合。
const shortcutKeys = new Set([
  ' ',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'f',
]);

// 编辑区和弹层内保留各自的键盘交互。
const inputSelector =
  'input,textarea,button,select,a,[data-slot="slider"],[data-slot="select-content"],[data-slot="dropdown-menu-content"],[data-slot="sheet-content"]:not([data-player-sheet]),[data-slot="dialog-content"],[contenteditable="true"]';

// 播放器快捷键与长按倍速独立于影片请求和历史保存。
export const useShortcuts = (
  media: ReturnType<typeof useMedia>,
  showControls: () => void,
) => {
  // 长按右方向键期间展示临时倍速提示。
  const holdingRate = ref(false);

  // 保存长按前的倍速，松手后恢复。
  let heldRate: number | undefined;

  // 长按判定随播放器卸载自动停止。
  const press = useTimeoutFn(
    () => {
      heldRate = media.rate.value;
      holdingRate.value = true;
      media.setRate(heldRate * 3);
    },
    holdDelay,
    { immediate: false },
  );

  // 松开按键或离开窗口后恢复用户选择的倍速。
  const releaseRate = () => {
    press.stop();
    holdingRate.value = false;

    if (heldRate !== undefined) {
      media.setRate(heldRate);
      heldRate = undefined;
      return true;
    }

    return false;
  };

  useEventListener(window, 'keydown', (event) => {
    if (event.key === 'Tab') {
      showControls();
      return;
    }

    if (
      (event.target instanceof HTMLElement &&
        event.target.closest(inputSelector)) ||
      event.ctrlKey ||
      event.altKey
    ) {
      return;
    }

    if (!shortcutKeys.has(event.key)) {
      return;
    }

    event.preventDefault();

    if (event.repeat && !['ArrowUp', 'ArrowDown'].includes(event.key)) {
      return;
    }

    switch (event.key) {
      case ' ':
        media.togglePlay();
        break;
      case 'ArrowLeft':
        media.seek(media.currentTime.value - 5);
        break;
      case 'ArrowUp':
        media.setVolume(media.volume.value + 0.05);
        break;
      case 'ArrowDown':
        media.setVolume(media.volume.value - 0.05);
        break;
      case 'f':
        media.toggleFullscreen();
        break;
      case 'ArrowRight':
        press.start();
        break;
    }
  });
  useEventListener(window, 'keyup', (event) => {
    if (
      event.key === 'ArrowRight' &&
      (press.isPending.value || holdingRate.value) &&
      !releaseRate()
    ) {
      media.seek(media.currentTime.value + 5);
    }
  });
  useEventListener(window, 'blur', releaseRate);
  useEventListener(document, 'visibilitychange', () => {
    if (document.hidden) {
      releaseRate();
    }
  });
  onScopeDispose(releaseRate);

  return holdingRate;
};
