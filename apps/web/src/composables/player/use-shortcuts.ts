import { onScopeDispose, ref } from 'vue';
import { useEventListener } from '@vueuse/core';
import type { useMedia } from './use-media.ts';

// 播放器快捷键与长按倍速独立于影片请求和历史保存。
export const useShortcuts = (
  media: ReturnType<typeof useMedia>,
  showControls: () => void,
) => {
  // 长按右方向键期间展示临时倍速提示。
  const holdingRate = ref(false);
  let pressTimer: ReturnType<typeof setTimeout> | undefined;
  let heldRate: number | undefined;

  // 松开按键或离开窗口后恢复用户选择的倍速。
  const releaseRate = () => {
    clearTimeout(pressTimer);
    pressTimer = undefined;
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
        event.target.closest(
          'input,textarea,button,select,a,[data-slot="slider"],[data-slot="select-content"],[data-slot="dropdown-menu-content"],[data-slot="sheet-content"]:not([data-player-sheet]),[data-slot="dialog-content"],[contenteditable="true"]',
        )) ||
      event.ctrlKey ||
      event.altKey
    ) {
      return;
    }

    if (
      ![' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'f'].includes(
        event.key,
      )
    ) {
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
        pressTimer = setTimeout(() => {
          heldRate = media.rate.value;
          holdingRate.value = true;
          media.setRate(heldRate * 3);
        }, 300);
        break;
    }
  });
  useEventListener(window, 'keyup', (event) => {
    if (event.key === 'ArrowRight' && pressTimer && !releaseRate()) {
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
