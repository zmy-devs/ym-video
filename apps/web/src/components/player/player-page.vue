<template>
  <PlayerSurface
    :class="{ 'player-immersive': immersive }"
    :status="status"
    :error="error"
    :playing="playing"
    :controls-visible="showControls"
    :fullscreen="fullscreen"
    :mobile="mobile"
    :seeking="mobile && seeking"
    :progress-percent="progressPercent"
    @container-ready="handleContainerReady"
    @show-controls="handleShowControls"
    @schedule-hide="handleScheduleHide"
    @keep-controls="handleKeepControls"
    @retry="loadMovie(true)"
    @toggle="handleTogglePlay"
  >
    <template #header>
      <header
        v-show="!immersive || (showControls && !seeking)"
        class="player-header flex shrink-0 items-center gap-2.5 border-b px-3"
        :class="headerClass"
      >
        <Tooltip label="返回" side="bottom">
          <Button
            aria-label="返回"
            variant="ghost"
            size="icon"
            :class="
              mobile
                ? 'size-11 bg-transparent text-white hover:bg-transparent hover:text-white dark:hover:bg-transparent'
                : 'size-7'
            "
            @click="emit('back')"
          >
            <ArrowLeft
              :class="mobile ? 'size-6' : 'size-4 transform-[translateX(1px)]'"
            />
          </Button>
        </Tooltip>
        <MoviePoster
          v-if="entry && !mobile"
          :src="entry.pic"
          alt=""
          class="size-5 shrink-0 rounded-full"
        />
        <Skeleton
          v-else-if="status === 'loading' && !mobile"
          class="size-5 shrink-0 rounded-full"
        />
        <span v-if="entry && !mobile" class="min-w-0 truncate text-sm">
          {{ entry.name }}
        </span>
        <Skeleton
          v-else-if="status === 'loading' && !mobile"
          class="h-4 w-32 rounded-sm"
        />
      </header>
    </template>
    <template #video>
      <video
        ref="video"
        class="relative z-0 min-h-0 w-full flex-1 object-contain"
        :class="{ 'touch-none': immersive }"
        playsinline
        :style="{ transform: `scale(${scale})` }"
        @click="handleVideoClick"
      />
    </template>
    <template #overlay>
      <p
        v-if="
          !seeking &&
          (gestureLabel || holdingRate || adjustingVolume || volumeVisible)
        "
        class="pointer-events-none absolute top-4 z-20 rounded-xl bg-popover px-4 py-2 text-sm text-popover-foreground"
      >
        <template v-if="gestureLabel">{{ gestureLabel }}</template>
        <template v-else-if="holdingRate">{{ rate }} 倍速播放中…</template>
        <template v-else>音量：{{ Math.round(volume * 100) }}%</template>
      </p>
    </template>
    <template #controls>
      <div ref="controls" class="w-full">
        <PlayerControls
          v-show="showControls"
          :name="entry?.name ?? ''"
          :episode-label="episode?.label ?? ''"
          :has-episodes="!!entry && entry.episodes.length > 1"
          :current-time="currentTime"
          :duration="duration"
          :seek-preview="seekPreview"
          :seeking="seeking"
          :rate="rate"
          :volume="volume"
          :fullscreen="fullscreen"
          :mobile="mobile"
          :show-fullscreen="!mobile"
          :container="container"
          :has-previous="!!entry && entry.episode > 0"
          :has-next="!!entry && entry.episode < entry.episodes.length - 1"
          :pip-available="pipAvailable"
          @seek="handleSeek"
          @dragging="progressDragging = $event"
          @rate="setRate"
          @volume="setVolume"
          @previous="handlePrevious"
          @next="handleNext"
          @pip="togglePip"
          @fullscreen="toggleFullscreen"
          @episodes="episodesOpen = true"
          @menu-open="menuOpen = $event"
        />
      </div>
    </template>
    <PlayerEpisodesSheet
      v-if="entry && entry.episodes.length > 1"
      v-model:open="episodesOpen"
      :episodes="entry.episodes"
      :selected="entry.episode"
      :container="container"
      :mobile="mobile"
      @select="selectEpisode"
    />
  </PlayerSurface>
</template>

<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';
import { useTitle } from '@vueuse/core';
import { ArrowLeft } from 'lucide-vue-next';
import { Button } from '@ym-video/ui/components/button';
import { Skeleton } from '@ym-video/ui/components/skeleton';
import Tooltip from '@ym-video/ui/common/tooltip.vue';
import MoviePoster from '../movie-card/poster.vue';
import PlayerControls from './player-controls.vue';
import PlayerEpisodesSheet from './player-episodes-sheet.vue';
import type { PlayerController } from '../../types/player.ts';
import { useGestures } from '../../composables/player/use-gestures.ts';
import { useShortcuts } from '../../composables/player/use-shortcuts.ts';
import { getProgress } from '../../utils/player.ts';
import PlayerSurface from './player-surface.vue';

// 播放器页面组合展示、控件和交互，外层负责影片与历史编排。
const props = defineProps<{
  player: PlayerController;
  immersive?: boolean;
  mobile?: boolean;
  headerClass?: string;
  brightness?: number;
}>();

// 页面参数在 PC 与移动端保持同一套布局开关。
const immersive = computed(() => props.immersive === true);
const mobile = computed(() => props.mobile === true);
const headerClass = computed(() => props.headerClass);

// 路由返回与设备亮度由应用接入。
const emit = defineEmits<{ back: []; brightness: [value: number] }>();

// 页面与控件使用同一份响应式媒体状态。
const player = props.player;

const {
  video,
  container,
  entry,
  episode,
  status,
  error,
  currentTime,
  duration,
  rate,
  volume,
  fullscreen,
  pipAvailable,
  loadMovie,
  selectEpisode,
  togglePlay,
  seek,
  setRate,
  setVolume,
  toggleFullscreen,
  togglePip,
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
    (value) => emit('brightness', value),
    handleKeepControls,
    handleScheduleHide,
  );

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
</script>

<style scoped>
.player-header {
  height: calc(44px + env(safe-area-inset-top, 0px));
  padding-top: env(safe-area-inset-top, 0px);
}

.player-header.desktop-title-bar {
  height: var(--title-bar-height);
  padding-top: 0;
  padding-left: calc((var(--title-bar-height) - 1.75rem) / 2);
}

.player-immersive .player-header {
  position: absolute;
  z-index: 10;
  inset: 0 0 auto;
  border: 0;
  height: auto;
  padding: 2px;
  padding-top: calc(2px + env(safe-area-inset-top, 0px));
  pointer-events: auto;
  background: linear-gradient(to bottom, rgb(0 0 0 / 65%), transparent);
}
</style>
