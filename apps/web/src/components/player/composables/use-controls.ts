import { computed, onScopeDispose, ref, watch } from 'vue';
import { useTitle } from '@vueuse/core';
import type { PlayerController } from '../types.ts';
import { useGestures } from './use-gestures.ts';
import { useShortcuts } from './use-shortcuts.ts';
import { getProgress } from '../utils/time.ts';

// 管理控制栏显隐、点击、快捷键和触屏手势。
export const usePlayerControls = (
  player: PlayerController,
  props: { mobile?: boolean; immersive?: boolean; brightness?: number },
  setBrightness: (value: number) => void,
) => {
  const mobile = computed(() => props.mobile === true);
  const immersive = computed(() => props.immersive === true);
  // 页面与控件使用同一份响应式媒体状态。
  const {
    video,
    container,
    entry,
    episode,
    status,
    currentTime,
    duration,
    volume,
    fullscreen,
    selectEpisode,
    togglePlay,
    seek,
  } = player;

  // 播放器容器创建后注入媒体层，用于全屏和弹层定位。
  const handleContainerReady = (element: HTMLElement) => {
    container.value = element;
  };

  // 控制栏从统一媒体状态派生播放标记。
  const playing = computed(
    () => status.value === 'playing' || status.value === 'buffering',
  );

  // 标签页只更新片名，图标沿用应用入口中的 ym-video 图标。
  useTitle(() => entry.value?.name || 'ym-video');

  // 控制栏用于判断鼠标和键盘是否仍在操作控件。
  const controls = ref<HTMLElement | null>(null);

  // 全屏时两秒无操作后收起控制栏。
  const controlsVisible = ref(true);

  // 直接拖动进度滑块时与画面横滑共用暂停状态。
  const progressDragging = ref(false);

  // 倍速菜单或音量浮窗打开期间持续显示控制栏。
  const menuOpen = ref(false);

  // 独立选集面板打开期间保留控制栏，不受倍速菜单状态影响。
  const episodesOpen = ref(false);

  // 桌面端使用方向键调音量时短暂显示提示。
  const volumeVisible = ref(false);

  // 移动端由轻触控制显隐，桌面端暂停和非全屏时显示完整控件。
  const showControls = computed(
    () =>
      (!props.immersive && !fullscreen.value) ||
      controlsVisible.value ||
      (!mobile.value && !playing.value),
  );

  // 完整控件收起后在画面底边显示已播放比例。
  const progressPercent = computed(() =>
    getProgress(currentTime.value, duration.value),
  );

  // 控制栏的关闭计时器。
  let controlsTimer: ReturnType<typeof setTimeout> | undefined;

  // 轻触等待双击判定结束后再切换控件。
  let tapTimer: ReturnType<typeof setTimeout> | undefined;

  // 保存待判定轻触的位置和时间。
  let lastTap: { time: number; x: number; y: number } | undefined;

  // 双击判定与单击等待使用同一时间窗口。
  const doubleTapDelay = 300;

  // 音量提示的关闭计时器。
  let volumeTimer: ReturnType<typeof setTimeout> | undefined;

  // 菜单和键盘操作期间保留控件，触屏不依赖悬停状态。
  const handleScheduleHide = () => {
    clearTimeout(controlsTimer);

    if (!playing.value) {
      return;
    }

    controlsTimer = setTimeout(() => {
      if (
        !menuOpen.value &&
        !episodesOpen.value &&
        (mobile.value || !controls.value?.matches(':hover')) &&
        !controls.value?.querySelector(':focus-visible')
      ) {
        controlsVisible.value = false;
      }
    }, 2000);
  };

  // 鼠标移动后显示控件并重新计时。
  const handleShowControls = () => {
    controlsVisible.value = true;
    handleScheduleHide();
  };

  // 播放器快捷键统一注册，并在 Tab 导航时唤出控制栏。
  const holdingRate = useShortcuts(player, handleShowControls);

  // 鼠标和键盘操作控制栏期间保持可见。
  const handleKeepControls = () => {
    clearTimeout(tapTimer);
    lastTap = undefined;
    controlsVisible.value = true;
    clearTimeout(controlsTimer);
  };

  // 倍速菜单、音量浮窗或选集面板收起后恢复自动隐藏。
  watch([menuOpen, episodesOpen], ([menu, episodes]) => {
    if (menu || episodes) {
      handleKeepControls();
    } else {
      handleScheduleHide();
    }
  });

  // 拖动期间保持暂停，单次进度跳转沿用继续播放的行为。
  const handleSeek = (seconds: number) => {
    seek(seconds);
    if (!playing.value && !seeking.value) {
      return togglePlay();
    }
  };

  // 切换到上一集并保留各集进度。
  const handlePrevious = () => {
    if (entry.value) {
      return selectEpisode(entry.value.episode - 1);
    }
  };

  // 切换到下一集，末集由业务层阻止越界。
  const handleNext = () => {
    if (entry.value) {
      return selectEpisode(entry.value.episode + 1);
    }
  };

  // 触摸画面支持拖动进度、调节亮度音量、长按倍速和双指缩放。
  const { gestureLabel, scale, suppressClick, seekPreview, adjustingVolume } =
    useGestures(
      player,
      () => props.brightness,
      setBrightness,
      handleKeepControls,
      handleScheduleHide,
    );

  // 恢复默认画面大小，并重新开始控件隐藏计时。
  const handleResetScale = () => {
    scale.value = 1;
    handleShowControls();
  };

  // 画面横滑与进度滑块拖动都属于进度调整。
  const seeking = computed(
    () => progressDragging.value || seekPreview.value !== undefined,
  );

  // 松手后只恢复拖动前正在播放的视频。
  let resumeAfterSeek = false;

  // 移动端调整进度时暂停画面，结束后恢复原播放状态。
  watch(
    seeking,
    (active) => {
      if (!mobile.value) {
        return;
      }

      if (active) {
        resumeAfterSeek = playing.value;
        video.value?.pause();
        return;
      }

      if (resumeAfterSeek) {
        resumeAfterSeek = false;
        return togglePlay();
      }
    },
    { flush: 'sync' },
  );

  // 播放操作取消待处理的轻触，保持控件当前的显隐状态。
  const handleTogglePlay = () => {
    clearTimeout(tapTimer);
    lastTap = undefined;
    return togglePlay();
  };

  // 触屏单击切换控件显隐，双击切换播放；鼠标单击切换播放。
  const handleVideoClick = (event: MouseEvent) => {
    if (suppressClick.value) {
      clearTimeout(tapTimer);
      lastTap = undefined;
      return;
    }

    if (
      (event instanceof PointerEvent && event.pointerType === 'touch') ||
      props.immersive
    ) {
      if (
        lastTap &&
        event.timeStamp - lastTap.time <= doubleTapDelay &&
        Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) <= 32
      ) {
        return handleTogglePlay();
      }

      clearTimeout(tapTimer);
      lastTap = { time: event.timeStamp, x: event.clientX, y: event.clientY };
      tapTimer = setTimeout(() => {
        lastTap = undefined;
        controlsVisible.value = !showControls.value;
        handleScheduleHide();
      }, doubleTapDelay);
      return;
    }

    return togglePlay();
  };

  watch(fullscreen, handleShowControls);

  // 移动端播放状态变化只更新隐藏计时，显隐交给用户轻触。
  watch(playing, () => {
    if (mobile.value) {
      handleScheduleHide();
      return;
    }

    handleShowControls();
  });

  watch(volume, () => {
    clearTimeout(volumeTimer);

    if (mobile.value || menuOpen.value) {
      volumeVisible.value = false;
      return;
    }

    volumeVisible.value = true;
    volumeTimer = setTimeout(() => {
      volumeVisible.value = false;
    }, 1000);
  });

  onScopeDispose(() => {
    clearTimeout(controlsTimer);
    clearTimeout(tapTimer);
    clearTimeout(volumeTimer);
  });

  return {
    ...player,
    mobile,
    immersive,
    playing,
    controls,
    showControls,
    seeking,
    progressPercent,
    holdingRate,
    gestureLabel,
    scale,
    seekPreview,
    adjustingVolume,
    volumeVisible,
    progressDragging,
    menuOpen,
    episodesOpen,
    handleContainerReady,
    handleShowControls,
    handleScheduleHide,
    handleKeepControls,
    handleTogglePlay,
    handleVideoClick,
    handleSeek,
    handlePrevious,
    handleNext,
    handleResetScale,
  };
};
