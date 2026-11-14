<template>
  <div
    class="player-page dark flex h-full flex-col overflow-hidden bg-background"
    :class="{ 'player-mobile': isMobile }"
  >
    <TooltipProvider :disabled="isMobile">
      <header
        v-if="!isMobile"
        class="player-header flex shrink-0 items-center gap-2.5 border-b px-3"
        :class="props.headerClass"
      >
        <MoviePoster
          v-if="entry"
          :src="entry.pic"
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
        <Tooltip label="关闭播放器" side="bottom">
          <Button
            variant="ghost"
            size="icon"
            class="ml-auto size-7"
            data-action="player-back"
            @click="emit('back')"
          >
            <X class="size-4" />
          </Button>
        </Tooltip>
      </header>
      <main
        ref="container"
        class="player-surface relative min-h-0 flex-1 overflow-hidden bg-black text-white outline-none"
        :class="{ 'cursor-none': fullscreen && !showControls && playing }"
        tabindex="-1"
        @pointermove="handlePointerMove"
        @pointerleave="controls.scheduleHide"
      >
        <video
          ref="video"
          class="relative z-0 size-full min-h-0 object-contain"
          :class="{ 'touch-none': isMobile }"
          playsinline
          :style="{ transform: `scale(${scale})` }"
          @click="handleVideoClick"
        />
        <div
          ref="controlElement"
          class="player-overlay pointer-events-none absolute inset-0 z-10 flex flex-col"
          :class="{ 'px-(--player-safe-x)': isMobile }"
        >
          <header
            v-if="isMobile"
            v-show="showControls && !seeking"
            class="player-mobile-header pointer-events-auto flex shrink-0 items-center justify-between"
          >
            <Button
              variant="ghost"
              size="icon"
              class="size-11 bg-transparent text-white hover:bg-transparent hover:text-white dark:hover:bg-transparent"
              aria-label="返回"
              data-action="player-back"
              @click="emit('back')"
            >
              <ArrowLeft class="size-6" />
            </Button>
            <Button
              v-if="scale !== 1"
              variant="outline"
              size="sm"
              class="dark:bg-background dark:hover:bg-accent"
              @click="handleResetScale"
            >
              还原画面
            </Button>
          </header>
          <PlayerFeedback />
          <CommonEmpty
            v-if="status === 'error'"
            label="播放失败"
            action="重新加载"
            :icon="CircleAlert"
            class="pointer-events-auto absolute inset-0 rounded-none bg-black/90"
            @action="loadMovie(true)"
          />
          <Spinner
            v-else-if="status === 'loading' || status === 'buffering'"
            data-slot="player-loading"
            class="absolute top-1/2 left-1/2 size-6 -translate-1/2"
          />
          <button
            v-else-if="status === 'paused' && !(isMobile && seeking)"
            type="button"
            aria-label="继续播放"
            class="pointer-events-auto absolute top-1/2 left-1/2 -translate-1/2 text-white drop-shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            @click="handleTogglePlay"
          >
            <Play class="size-20 fill-current" />
          </button>
          <PlayerControls
            v-show="showControls"
            class="pointer-events-auto mt-auto shrink-0"
            @pointerenter="controls.keep"
            @pointerleave="controls.scheduleHide"
            @pointermove="controls.keep"
            @focusin="controls.keep"
            @focusout="controls.scheduleHide"
          >
            <button
              v-if="!isMobile && scale !== 1"
              type="button"
              class="absolute bottom-full left-1/2 mb-4 min-h-11 -translate-x-1/2 rounded-xl bg-popover px-4 py-2 text-sm text-popover-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              @click="handleResetScale"
            >
              还原画面
            </button>
          </PlayerControls>
          <div
            v-show="!showControls"
            data-slot="player-mini-progress"
            class="mt-auto h-px shrink-0"
            :class="{ 'mb-px': !isMobile && fullscreen }"
          >
            <div
              class="h-full bg-primary"
              :style="{ width: `${progressPercent}%` }"
            />
          </div>
        </div>
        <PlayerEpisodesSheet v-if="entry && entry.episodes.length > 1" />
      </main>
    </TooltipProvider>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTitle } from '@vueuse/core';
import { ArrowLeft, CircleAlert, Play, X } from 'lucide-vue-next';
import { Button } from '@ym-video/ui/components/button';
import { Skeleton } from '@ym-video/ui/components/skeleton';
import { Spinner } from '@ym-video/ui/components/spinner';
import { TooltipProvider } from '@ym-video/ui/components/tooltip';
import Tooltip from '@ym-video/ui/common/tooltip.vue';
import CommonEmpty from '@ym-video/ui/common/empty.vue';
import MoviePoster from '../movie-card/poster.vue';
import PlayerControls from './components/player-controls.vue';
import PlayerEpisodesSheet from './components/player-episodes-sheet.vue';
import PlayerFeedback from './components/player-feedback.vue';
import type { PlayerController } from './types.ts';
import { providePlayerContext } from './context.ts';
import { useControls } from './composables/use-controls.ts';
import { useGestures } from './composables/use-gestures.ts';
import { useSeeking } from './composables/use-seeking.ts';
import { useShortcuts } from './composables/use-shortcuts.ts';
import { useVideoClick } from './composables/use-video-click.ts';
import { getProgress } from './utils/time.ts';
import { isMobile } from '@/platform';

// 页面接入媒体控制器，设备亮度由原生壳负责。
const props = defineProps<{
  player: PlayerController;
  headerClass?: string;
  brightness?: number;
}>();

// 路由返回与设备亮度由外层应用接入。
const emit = defineEmits<{ back: []; brightness: [value: number] }>();

// 页面只读取视频元素和自身展示的数据。
const {
  video,
  container,
  entry,
  status,
  fullscreen,
  currentTime,
  duration,
  loadMovie,
} = props.player;

// 各种交互分别管理自己的状态与生命周期。
const controls = useControls(props.player);
const gestures = useGestures(
  props.player,
  () => props.brightness,
  (value) => emit('brightness', value),
  controls.keep,
  controls.scheduleHide,
);
const progress = useSeeking(props.player, gestures.seekPreview);
const { handleVideoClick, handleTogglePlay } = useVideoClick(
  props.player,
  controls,
  gestures.suppressClick,
);
const holdingRate = useShortcuts(props.player, controls.show);

// 子组件直接读取当前播放器，控件之间共享同一份状态。
providePlayerContext({
  player: props.player,
  controls,
  gestures,
  progress,
  holdingRate,
});

// 模板使用实际参与页面布局的交互状态。
const { element: controlElement, playing, showControls } = controls;
const { scale } = gestures;
const { seeking } = progress;

// 小进度条反映当前影片的真实播放比例。
const progressPercent = computed(() =>
  getProgress(currentTime.value, duration.value),
);

// 标签页标题跟随当前影片。
useTitle(() => entry.value?.name || 'ym-video');

// 触屏轻触交给视频手势，只有鼠标移动会唤出控件。
const handlePointerMove = (event: PointerEvent) => {
  if (event.pointerType === 'mouse') {
    controls.show();
  }
};

// 恢复默认画面大小，并重新开始控件隐藏计时。
const handleResetScale = () => {
  scale.value = 1;
  controls.show();
};
</script>

<style scoped>
.player-header {
  height: calc(44px + env(safe-area-inset-top, 0px));
  padding-top: env(safe-area-inset-top, 0px);
}

.player-header.desktop-title-bar {
  height: var(--title-bar-height);
  padding-top: 0;
  padding-right: 6px;
  padding-left: 12px;
}

.player-mobile-header {
  padding: 2px;
  padding-top: calc(2px + env(safe-area-inset-top, 0px));
}

/* 横屏时按状态栏安全区布置整层控件。 */
.player-mobile {
  --player-safe-x: max(
    env(safe-area-inset-top, 0px),
    env(safe-area-inset-left, 0px),
    env(safe-area-inset-right, 0px)
  );
}

.player-surface:fullscreen {
  width: 100%;
  height: 100%;
}

/* Windows 全屏时将视频与页面一起合成，保留黑边上的进度条。 */
.player-page:not(.player-mobile) .player-surface:fullscreen video {
  filter: opacity(1);
}

.player-page {
  --player-control: rgb(100 100 100 / 80%);
  --player-shadow: 0 1px 5px rgb(0 0 0 / 50%);
}
</style>
