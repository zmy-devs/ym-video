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
        :class="props.headerClass"
      >
        <Tooltip v-if="mobile" label="返回" side="bottom">
          <Button
            variant="ghost"
            size="icon"
            class="size-11 bg-transparent text-white hover:bg-transparent hover:text-white dark:hover:bg-transparent"
            data-action="player-back"
            @click="emit('back')"
          >
            <ArrowLeft class="size-6" />
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
        <Tooltip v-if="!mobile" label="关闭播放器" side="bottom">
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
    </template>
    <template #video>
      <video
        ref="video"
        class="relative z-0 min-h-0 object-contain"
        :class="[
          mobile ? 'h-full w-auto max-w-full' : 'w-full flex-1',
          { 'touch-none': immersive },
        ]"
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
      <div ref="controls" class="relative w-full">
        <button
          v-if="scale !== 1"
          v-show="showControls"
          type="button"
          class="absolute bottom-full left-1/2 min-h-11 -translate-x-1/2 rounded-xl bg-popover px-4 py-2 text-sm text-popover-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          :class="mobile ? 'mb-0' : 'mb-4'"
          @click="handleResetScale"
        >
          还原画面
        </button>
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
import { ArrowLeft, X } from 'lucide-vue-next';
import { Button } from '@ym-video/ui/components/button';
import { Skeleton } from '@ym-video/ui/components/skeleton';
import Tooltip from '@ym-video/ui/common/tooltip.vue';
import MoviePoster from '../movie-card/poster.vue';
import PlayerControls from './components/player-controls.vue';
import PlayerEpisodesSheet from './components/player-episodes-sheet.vue';
import type { PlayerController } from './types.ts';
import PlayerSurface from './components/player-surface.vue';
import { usePlayerControls } from './composables/use-controls.ts';

// 播放器页面组合展示、控件和交互，外层负责影片与历史编排。
const props = defineProps<{
  player: PlayerController;
  immersive?: boolean;
  mobile?: boolean;
  headerClass?: string;
  brightness?: number;
}>();

// 路由返回与设备亮度由外层应用接入。
const emit = defineEmits<{ back: []; brightness: [value: number] }>();

// 视图直接使用媒体状态和控制栏交互。
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
  setRate,
  setVolume,
  toggleFullscreen,
  togglePip,
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
} = usePlayerControls(props.player, props, (value) =>
  emit('brightness', value),
);
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

.player-immersive .player-header {
  position: absolute;
  z-index: 10;
  inset: 0 0 auto;
  border: 0;
  height: auto;
  padding: 2px;
  padding-top: calc(2px + env(safe-area-inset-top, 0px));
  pointer-events: auto;
}
</style>
