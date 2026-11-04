<template>
  <div
    class="player-page dark h-full flex flex-col overflow-hidden bg-background"
    :data-theme-color="theme.color"
  >
    <TitleBar class="gap-2.5 pl-[calc((var(--title-bar-height)-1.75rem)/2)]">
      <Tooltip label="返回" side="bottom">
        <Button
          variant="ghost"
          size="icon"
          class="size-7 shrink-0"
          @click="handleBack"
        >
          <ArrowLeft class="size-4" />
        </Button>
      </Tooltip>
      <MoviePoster
        v-if="entry"
        :src="entry.pic"
        alt=""
        class="size-5 shrink-0 rounded-full"
      />
      <Skeleton
        v-else-if="status === 'loading'"
        class="size-5 shrink-0 rounded-full"
      />
      <span v-if="entry" class="min-w-0 truncate text-sm">
        {{ entry.name }}
      </span>
      <Skeleton
        v-else-if="status === 'loading'"
        class="h-4 w-32 rounded-sm"
      />
    </TitleBar>
    <div class="min-h-0 flex flex-1">
      <main
        ref="container"
        class="player-surface min-w-0 relative isolate flex flex-1 flex-col items-center justify-center overflow-hidden outline-none bg-black text-white"
        :class="{ 'cursor-none': fullscreen && !controlsVisible && playing }"
        tabindex="-1"
        @pointermove="handleShowControls"
        @pointerleave="handleScheduleHide"
      >
        <video
          ref="video"
          class="min-h-0 w-full relative z-0 flex-1 object-contain"
          playsinline
          @click="togglePlay"
        />

        <Empty
          v-if="status === 'error'"
          class="absolute inset-0 rounded-none bg-black/90"
        >
          <EmptyHeader class="max-w-full">
            <EmptyMedia variant="icon">
              <CircleAlert />
            </EmptyMedia>
            <EmptyTitle>播放失败</EmptyTitle>
            <EmptyDescription class="max-w-full truncate">
              {{ error }}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button @click="loadMovie(true)"> <RotateCw />重新加载 </Button>
          </EmptyContent>
        </Empty>
        <div
          v-else-if="status === 'loading' || status === 'buffering'"
          data-slot="player-loading"
          class="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <LoaderCircle class="size-10 animate-spin drop-shadow-md" />
        </div>
        <button
          v-else-if="status === 'paused'"
          class="absolute flex items-center justify-center text-white drop-shadow-md"
          @click="togglePlay"
        >
          <!-- 与桌面端一致的 Fluent Play 20 Filled 圆角轮廓。 -->
          <svg class="size-20" viewBox="0 0 20 20" fill="currentColor">
            <path
              d="M17.222 8.685a1.5 1.5 0 0 1 0 2.628l-10 5.498A1.5 1.5 0 0 1 5 15.496V4.502a1.5 1.5 0 0 1 2.223-1.314l10 5.497Z"
            />
          </svg>
        </button>

        <div
          class="player-overlay pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
        >
          <p
            v-if="volumeVisible || holdingRate"
            class="absolute top-4 z-20 rounded-xl bg-popover px-4 py-2 text-sm text-popover-foreground"
          >
            <template v-if="holdingRate">{{ rate }} 倍速播放中…</template>
            <template v-else>音量：{{ Math.round(volume * 100) }}%</template>
          </p>

          <div
            ref="controls"
            class="pointer-events-auto w-full absolute bottom-0 left-0 z-10"
            @pointerenter="handleKeepControls"
            @pointerleave="handleScheduleHide"
            @pointermove="handleKeepControls"
            @focusin="handleKeepControls"
            @focusout="handleScheduleHide"
          >
            <PlayerControls
              v-show="showControls"
              :name="entry?.name ?? ''"
              :episode-label="episode?.label ?? ''"
              :has-episodes="!!entry && entry.episodes.length > 1"
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
        </div>
        <!-- 细进度独占底边，避免全屏视频合成层覆盖绝对定位的浮层。 -->
        <div
          v-if="!showControls"
          class="player-mini-progress w-full h-[3px] relative z-10 shrink-0 bg-[var(--player-control)]"
        >
          <div
            class="h-full bg-primary"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>
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
import { useRouter } from 'vue-router';
import { useTitle } from '@vueuse/core';
import {
  ArrowLeft,
  LoaderCircle,
  CircleAlert,
  RotateCw,
} from 'lucide-vue-next';
import { Button } from '@ym-video/ui/components/button';
import { Skeleton } from '@ym-video/ui/components/skeleton';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@ym-video/ui/components/empty';
import Tooltip from '@ym-video/ui/common/tooltip.vue';
import MoviePoster from '@/components/movie-card/poster.vue';
import PlayerControls from '@/components/player/player-controls.vue';
import PlayerEpisodesSheet from '@/components/player/player-episodes-sheet.vue';
import { usePlayer } from '@/composables/use-player';
import { useShortcuts } from '@/composables/player/use-shortcuts';
import { useThemeStore } from '@/stores/theme-store';
import TitleBar from '@/layout/title-bar/index.vue';
import { getProgress } from '@/utils/progress';

// 播放器使用公共暗色主题，并沿用用户选择的强调色。
const theme = useThemeStore();

// 通过站内历史恢复进入播放器前的列表与筛选状态。
const router = useRouter();

// 有上一条站内记录时返回，直接打开播放器时进入主页。
const handleBack = () => {
  if (router.options.history.state.back) {
    router.back();

    return;
  }

  return router.replace('/overview');
};

// 媒体加载、播放状态与浏览器能力。
const player = usePlayer();

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

// 倍速菜单或音量浮窗打开期间持续显示控制栏。
const menuOpen = ref(false);

// 独立选集面板打开期间保留控制栏，不受倍速菜单状态影响。
const episodesOpen = ref(false);

// 使用方向键调音量时短暂显示音量提示。
const volumeVisible = ref(false);

// 控制栏与底部细进度互斥，暂停和非全屏状态始终显示完整控件。
const showControls = computed(
  () => !fullscreen.value || controlsVisible.value || !playing.value,
);

// 完整控件收起后在画面底边显示已播放比例。
const progressPercent = computed(() =>
  getProgress(currentTime.value, duration.value),
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

// 播放器快捷键统一注册，并在 Tab 导航时唤出控制栏。
const holdingRate = useShortcuts(player.media, handleShowControls);

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

watch([fullscreen, playing], handleShowControls);

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
/* 独立合成控制栏和提示，避免全屏视频持续播放时跳过浮层重绘。 */
.player-overlay {
  transform: translateZ(0);
}

.player-surface:fullscreen {
  width: 100%;
  height: 100%;
}

/* 桌面窗口的选集与遮罩避开页面工具栏，全屏时铺满画面。 */
.player-surface:not(:fullscreen) :deep([data-slot='sheet-content']) {
  top: var(--title-bar-height);
  height: calc(100% - var(--title-bar-height));
}

.player-surface:not(:fullscreen) :deep([data-slot='sheet-overlay']) {
  top: var(--title-bar-height);
}

.player-page {
  --player-control: rgb(100 100 100 / 80%);
  --player-shadow: 0 1px 5px rgb(0 0 0 / 50%);
}
</style>
