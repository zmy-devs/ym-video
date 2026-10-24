<template>
  <div
    class="player-page dark h-full flex flex-col overflow-hidden bg-background text-foreground"
    :data-theme-color="theme.color"
  >
    <header
      v-if="isDesktop"
      class="desktop-title-bar desktop-title-bar-standalone fixed inset-x-0 top-0 z-40 flex items-center gap-2.5 border-b pl-[calc((var(--desktop-window-controls-height)-1.75rem)/2)] pr-36 text-foreground"
    >
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            as-child
            variant="ghost"
            size="icon"
            class="size-7 shrink-0 [-webkit-app-region:no-drag]"
          >
            <RouterLink to="/overview" aria-label="返回主页">
              <ArrowLeft class="size-4" aria-hidden="true" />
            </RouterLink>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">返回主页</TooltipContent>
      </Tooltip>
      <MoviePoster
        v-if="entry"
        :src="entry.pic"
        alt=""
        aria-hidden="true"
        class="size-5 shrink-0 rounded-full"
      />
      <span v-if="entry" class="min-w-0 truncate text-sm" :title="entry.name">
        {{ entry.name }}
      </span>
    </header>
    <div class="min-h-0 flex flex-1">
      <main
        ref="container"
        class="player-surface min-w-0 relative flex flex-1 items-center justify-center overflow-hidden bg-black text-white"
        :class="{ 'cursor-none': fullscreen && !controlsVisible && playing }"
        aria-label="视频播放器"
        @pointermove="handleShowControls"
        @pointerleave="handleScheduleHide"
      >
        <video
          ref="video"
          class="size-full object-contain"
          playsinline
          @click="togglePlay"
          @loadedmetadata="handleMetadata"
          @timeupdate="handleTime"
          @seeked="handleSeeked"
          @play="playing = true"
          @pause="handlePause"
          @waiting="buffering = true"
          @playing="buffering = false"
          @canplay="buffering = false"
          @ended="handleEnded"
          @error="handleMediaError"
        />

        <Empty
          v-if="error"
          role="alert"
          class="absolute inset-0 rounded-none bg-black/90"
        >
          <EmptyHeader class="max-w-full">
            <EmptyMedia variant="icon">
              <CircleAlert aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>播放失败</EmptyTitle>
            <EmptyDescription class="max-w-full truncate">
              {{ error }}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button type="button" @click="loadMovie(true)">
              <RotateCw aria-hidden="true" />重新加载
            </Button>
          </EmptyContent>
        </Empty>
        <div
          v-else-if="loading || buffering"
          role="status"
          class="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <LoaderCircle class="size-10 animate-spin drop-shadow-md" />
          <span class="sr-only">正在加载视频</span>
        </div>
        <button
          v-else-if="!playing"
          type="button"
          class="absolute flex items-center justify-center text-white drop-shadow-md"
          aria-label="开始播放"
          @click="togglePlay"
        >
          <!-- 与桌面端一致的 Fluent Play 20 Filled 圆角轮廓。 -->
          <svg
            class="size-20"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              d="M17.222 8.685a1.5 1.5 0 0 1 0 2.628l-10 5.498A1.5 1.5 0 0 1 5 15.496V4.502a1.5 1.5 0 0 1 2.223-1.314l10 5.497Z"
            />
          </svg>
        </button>

        <div
          v-if="volumeVisible"
          role="status"
          class="pointer-events-none w-60 h-10 absolute top-4 overflow-hidden rounded-xl bg-white/40 shadow-md"
          :aria-label="`音量 ${Math.round(volume * 100)}%`"
        >
          <div class="h-full bg-white" :style="{ width: `${volume * 100}%` }" />
          <Volume2
            v-if="volume"
            class="size-5 absolute top-2.5 left-3 text-black"
          />
          <VolumeX v-else class="size-5 absolute top-2.5 left-3 text-black" />
        </div>
        <p
          v-else-if="holdingRate"
          role="status"
          class="pointer-events-none absolute top-4 rounded-xl bg-popover px-4 py-2 text-sm text-popover-foreground"
        >
          {{ rate }} 倍速播放中…
        </p>

        <div
          ref="controls"
          class="w-full absolute bottom-0 left-0 z-10"
          @pointerenter="handleKeepControls"
          @pointerleave="handleScheduleHide"
          @pointermove="handleKeepControls"
          @focusin="handleKeepControls"
          @focusout="handleScheduleHide"
        >
          <PlayerControls
            v-show="!fullscreen || controlsVisible || !playing"
            :name="entry?.name ?? ''"
            :episode-label="episode?.label ?? ''"
            :has-episodes="!!entry && entry.episodes.length > 1"
            :episodes-open="episodesOpen"
            :current-time="currentTime"
            :duration="duration"
            :rate="rate"
            :volume="volume"
            :fullscreen="fullscreen"
            :container="container"
            :has-previous="!!entry && entry.episode > 0"
            :has-next="!!entry && entry.episode < entry.episodes.length - 1"
            :pip-available="pipAvailable"
            @seek="handleSeek"
            @rate="setRate"
            @volume="setVolume"
            @previous="handlePrevious"
            @next="handleNext"
            @pip="togglePip"
            @fullscreen="toggleFullscreen"
            @menu-open="menuOpen = $event"
          />
        </div>
        <div
          v-if="fullscreen"
          class="pointer-events-none h-[3px] absolute bottom-0 left-0 z-10 bg-white"
          :style="{ width: `${progressPercent}%` }"
          aria-hidden="true"
        />
        <PlayerEpisodesSheet
          v-if="entry && entry.episodes.length > 1"
          v-model:open="episodesOpen"
          :episodes="entry.episodes"
          :selected="entry.episode"
          :container="container"
          @select="selectEpisode"
        />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { useEventListener, useTitle } from '@vueuse/core';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  LoaderCircle,
  CircleAlert,
  RotateCw,
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import MoviePoster from '@/components/movie-poster.vue';
import PlayerControls from '@/components/player/player-controls.vue';
import PlayerEpisodesSheet from '@/components/player/player-episodes-sheet.vue';
import { usePlayer } from '@/composables/use-player';
import { useThemeStore } from '@/stores/theme';

// 仅桌面播放器显示带影片信息的可拖动标题栏。
const isDesktop = Boolean(window.ipc);

// 播放器使用公共暗色主题，并沿用用户选择的强调色。
const theme = useThemeStore();

// 媒体加载、播放状态与浏览器能力。
const {
  video,
  container,
  entry,
  episode,
  loading,
  buffering,
  error,
  playing,
  currentTime,
  duration,
  rate,
  volume,
  fullscreen,
  holdingRate,
  pipAvailable,
  loadMovie,
  selectEpisode,
  handleMetadata,
  handlePause,
  handleSeeked,
  handleTime,
  togglePlay,
  seek,
  setRate,
  setVolume,
  toggleFullscreen,
  togglePip,
  save,
} = usePlayer();

// 标签页只更新片名，图标沿用应用入口中的 ym-video 图标。
useTitle(() => entry.value?.name || 'ym-video');

// 控制栏用于判断鼠标和键盘是否仍在操作控件。
const controls = ref<HTMLElement | null>(null);

// 全屏时两秒无操作后收起控制栏。
const controlsVisible = ref(true);

// 倍速菜单或音量浮窗打开期间持续显示控制栏。
const menuOpen = ref(false);

// 独立选集面板打开期间保留控制栏，不受倍速菜单状态影响。
const episodesOpen = ref(false);

// 使用方向键调音量时短暂显示音量提示。
const volumeVisible = ref(false);

// 全屏时始终在画面底边显示已播放比例，不随控制栏收起。
const progressPercent = computed(() =>
  duration.value
    ? Math.min(100, Math.max(0, (currentTime.value / duration.value) * 100))
    : 0,
);

// 控制栏的关闭计时器。
let controlsTimer: ReturnType<typeof setTimeout> | undefined;

// 音量提示的关闭计时器。
let volumeTimer: ReturnType<typeof setTimeout> | undefined;

// 菜单、鼠标或焦点占用时保留控件，避免隐藏正在操作的按钮。
const handleScheduleHide = () => {
  clearTimeout(controlsTimer);
  controlsTimer = setTimeout(() => {
    if (
      !menuOpen.value &&
      !episodesOpen.value &&
      !controls.value?.matches(':hover') &&
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

// 鼠标和键盘操作控制栏期间保持可见。
const handleKeepControls = () => {
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

// 与桌面端一致，选择进度后继续播放。
const handleSeek = (seconds: number) => {
  seek(seconds);
  if (!playing.value) {
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

// 本集结束后自动播放下一集。
const handleEnded = async () => {
  playing.value = false;
  await save();
  await handleNext();
};

// 浏览器解码失败时提供恢复入口。
const handleMediaError = () => {
  if (!loading.value && episode.value && video.value?.error) {
    buffering.value = false;
    error.value = '视频无法加载或解码，请重试或切换资源源';
  }
};

watch([fullscreen, playing], handleShowControls);

// 全屏控件收起后，Tab 仍可唤出并进入键盘操作。
useEventListener(document, 'keydown', (event) => {
  if (event.key === 'Tab') {
    handleShowControls();
  }
});

watch(volume, () => {
  clearTimeout(volumeTimer);

  if (menuOpen.value) {
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
  clearTimeout(volumeTimer);
});
</script>

<style scoped>
.player-surface:fullscreen {
  width: 100%;
  height: 100%;
}

.player-page {
  --player-control: rgb(100 100 100 / 80%);
  --player-shadow: 0 1px 5px rgb(0 0 0 / 50%);
}
</style>
