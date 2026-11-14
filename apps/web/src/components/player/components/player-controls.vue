<template>
  <div
    class="relative flex flex-col gap-3 pt-4 pb-2"
    :class="{ 'px-4': !isMobile }"
  >
    <slot />
    <div v-show="!seeking" class="flex items-center justify-between gap-4">
      <p
        class="min-w-0 truncate text-3xl text-white/80 text-shadow-[0_1px_3px_#000]"
      >
        {{ label }}
      </p>
      <div class="flex shrink-0 items-center gap-2">
        <PlayerEpisodeNavigation v-if="hasEpisodes" />
        <PlayerVolume v-if="!isMobile" />
        <PlayerRateControl />
        <PlayerButton
          v-if="pipAvailable"
          label="画中画"
          :disabled="!duration"
          @click="togglePip"
        >
          <PictureInPicture2 />
        </PlayerButton>
        <PlayerButton
          v-if="hasEpisodes"
          label="选集"
          @click="episodesOpen = true"
        >
          <ListVideo />
        </PlayerButton>
        <PlayerButton
          v-if="!isMobile && fullscreenAvailable"
          :label="fullscreen ? '退出全屏' : '全屏'"
          @click="toggleFullscreen"
        >
          <Minimize v-if="fullscreen" />
          <Maximize v-else />
        </PlayerButton>
      </div>
    </div>
    <PlayerProgress />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  ListVideo,
  Maximize,
  Minimize,
  PictureInPicture2,
} from 'lucide-vue-next';
import PlayerButton from './player-button.vue';
import PlayerEpisodeNavigation from './player-episode-navigation.vue';
import PlayerProgress from './player-progress.vue';
import PlayerRateControl from './player-rate-control.vue';
import PlayerVolume from './player-volume.vue';
import { usePlayerContext } from '../context.ts';
import { formatRemarks } from '../../../utils/movie.ts';
import { isMobile } from '@/platform';

// 控制栏直接组合当前播放器的数据与操作。
const { player, controls, progress } = usePlayerContext();
const {
  entry,
  episode,
  duration,
  pipAvailable,
  fullscreen,
  togglePip,
  toggleFullscreen,
} = player;
const { episodesOpen } = controls;
const { seeking } = progress;

// 多集影片显示相邻集与选集入口。
const hasEpisodes = computed(
  () => !!entry.value && entry.value.episodes.length > 1,
);

// 浏览器是否提供原生全屏能力。
const fullscreenAvailable = document.fullscreenEnabled;

// 影片名称与集数在使用位置组成标题。
const label = computed(() =>
  [entry.value?.name, formatRemarks(episode.value?.label ?? '')]
    .filter(Boolean)
    .join(' · '),
);
</script>
