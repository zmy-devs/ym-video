import { computed, ref, watch } from 'vue';
import { useTimeoutFn } from '@vueuse/core';
import type { PlayerController } from '../types.ts';
import { isMobile } from '@/platform';

// 播放时无操作两秒后隐藏控件。
const hideDelay = 2000;

// 管理控件显隐，以及菜单和键盘焦点对自动隐藏的约束。
export const useControls = (player: PlayerController) => {
  // 悬浮层用于检查控件悬停和键盘焦点。
  const element = ref<HTMLElement | null>(null);

  // 用户轻触和鼠标操作控制的显隐状态。
  const visible = ref(true);

  // 倍速、音量和选集面板直接共享各自的打开状态。
  const rateOpen = ref(false);
  const volumeOpen = ref(false);
  const episodesOpen = ref(false);

  // 任意设置菜单打开时保持控件可见。
  const menuOpen = computed(() => rateOpen.value || volumeOpen.value);

  // 缓冲期间沿用播放中的自动隐藏行为。
  const playing = computed(
    () =>
      player.status.value === 'playing' || player.status.value === 'buffering',
  );

  // 桌面窗口和暂停状态保持完整控件，移动端由轻触切换。
  const showControls = computed(
    () =>
      (!isMobile && !player.fullscreen.value) ||
      visible.value ||
      (!isMobile && !playing.value),
  );

  // 定时器随当前页面作用域自动清理。
  const hide = useTimeoutFn(
    () => {
      if (
        !menuOpen.value &&
        !episodesOpen.value &&
        (isMobile || !element.value?.matches(':hover')) &&
        !element.value?.querySelector(':focus-visible')
      ) {
        visible.value = false;
      }
    },
    hideDelay,
    { immediate: false },
  );

  // 播放时重新开始隐藏计时，暂停时保持当前状态。
  const scheduleHide = () => {
    hide.stop();
    if (playing.value) {
      hide.start();
    }
  };

  // 鼠标移动或进入全屏后显示控件并开始计时。
  const show = () => {
    visible.value = true;
    scheduleHide();
  };

  // 操作控件期间暂停自动隐藏。
  const keep = () => {
    visible.value = true;
    hide.stop();
  };

  // 轻触切换用户控制的显隐状态。
  const toggle = () => {
    visible.value = !showControls.value;
    scheduleHide();
  };

  watch([menuOpen, episodesOpen], ([menu, episodes]) => {
    if (menu || episodes) {
      keep();
    } else {
      scheduleHide();
    }
  });

  watch(player.fullscreen, show);

  watch(playing, () => {
    if (isMobile) {
      scheduleHide();
    } else {
      show();
    }
  });

  return {
    element,
    playing,
    showControls,
    rateOpen,
    volumeOpen,
    episodesOpen,
    menuOpen,
    scheduleHide,
    show,
    keep,
    toggle,
  };
};
