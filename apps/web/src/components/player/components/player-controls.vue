<template>
  <div class="flex flex-col gap-3 px-4 pt-4">
    <div v-show="!seeking" class="flex items-center justify-between gap-4">
      <p
        class="min-w-0 truncate text-3xl text-white/80 text-shadow-[0_1px_3px_#000]"
      >
        {{ label }}
      </p>
      <div class="flex shrink-0 items-center gap-2">
        <PlayerEpisodeNavigation
          v-if="hasEpisodes"
          :has-previous="hasPrevious"
          :has-next="hasNext"
          :container="container"
          @previous="emit('previous')"
          @next="emit('next')"
        />
        <PlayerVolume
          v-if="!mobile"
          v-model:open="volumeOpen"
          :volume="volume"
          :container="container"
          @volume="emit('volume', $event)"
        />
        <PlayerRateControl
          v-model:open="rateOpen"
          :rate="rate"
          :mobile="mobile"
          :container="container"
          @rate="emit('rate', $event)"
        />
        <PlayerPipButton
          :available="pipAvailable"
          :container="container"
          :disabled="!duration"
          @pip="emit('pip')"
        />
        <PlayerEpisodesButton
          :available="hasEpisodes"
          :container="container"
          @click="emit('episodes')"
        />
        <PlayerFullscreenButton
          v-if="showFullscreen"
          :available="fullscreenAvailable"
          :fullscreen="fullscreen"
          :container="container"
          @toggle="emit('fullscreen')"
        />
      </div>
    </div>
    <PlayerProgress
      :current-time="currentTime"
      :duration="duration"
      :preview-time="seekPreview"
      :mobile="mobile"
      @seek="emit('seek', $event)"
      @dragging="emit('dragging', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import PlayerEpisodeNavigation from './player-episode-navigation.vue';
import PlayerEpisodesButton from './player-episodes-button.vue';
import PlayerFullscreenButton from './player-fullscreen-button.vue';
import PlayerPipButton from './player-pip-button.vue';
import PlayerProgress from './player-progress.vue';
import PlayerRateControl from './player-rate-control.vue';
import PlayerVolume from './player-volume.vue';
import { formatRemarks } from '../../../utils/movie.ts';

// 控制栏显示影片信息并反映真实媒体状态。
const props = defineProps<{
  name: string;
  episodeLabel: string;
  hasEpisodes: boolean;
  currentTime: number;
  duration: number;
  seekPreview?: number;
  seeking?: boolean;
  rate: number;
  volume: number;
  fullscreen: boolean;
  mobile?: boolean;
  showFullscreen: boolean;
  container: HTMLElement | null;
  hasPrevious: boolean;
  hasNext: boolean;
  pipAvailable: boolean;
}>();

// 用户操作由页面接入播放器业务。
const emit = defineEmits<{
  seek: [seconds: number];
  dragging: [active: boolean];
  rate: [speed: number];
  volume: [value: number];
  previous: [];
  next: [];
  pip: [];
  fullscreen: [];
  episodes: [];
  menuOpen: [open: boolean];
}>();

// 分别保留两个浮层状态，切换时不会误报控制栏已关闭。
const rateOpen = ref(false);

// 音量浮窗的打开状态。
const volumeOpen = ref(false);

// 任意浮层打开期间均保持全屏控制栏可见。
const menuOpen = computed(() => rateOpen.value || volumeOpen.value);

watch(menuOpen, (value) => emit('menuOpen', value));

// 浏览器原生全屏能力。
const fullscreenAvailable = document.fullscreenEnabled;

// 桌面端同款的影片名称与集数标题。
const label = computed(() =>
  [props.name, formatRemarks(props.episodeLabel)].filter(Boolean).join(' · '),
);
</script>
