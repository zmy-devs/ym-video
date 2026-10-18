<template>
  <div class="flex flex-col gap-3 px-4 pt-4">
    <div class="flex items-center justify-between gap-4">
      <p
        class="player-label min-w-0 truncate text-3xl text-white/80"
        :title="label"
      >
        {{ label }}
      </p>
      <div class="flex shrink-0 items-center gap-2">
        <PlayerButton
          v-if="hasPrevious"
          label="上一集"
          :container="container"
          @click="emit('previous')"
        >
          <SkipBack />
        </PlayerButton>
        <PlayerButton
          v-if="hasNext"
          label="下一集"
          :container="container"
          @click="emit('next')"
        >
          <SkipForward />
        </PlayerButton>
        <PlayerVolume
          v-model:open="volumeOpen"
          :volume="volume"
          :container="container"
          @volume="emit('volume', $event)"
        />
        <DropdownMenu v-model:open="rateOpen">
          <DropdownMenuTrigger as-child>
            <PlayerButton
              :label="`播放速度：${formatRate(rate)}x`"
              :container="container"
            >
              <Gauge />
            </PlayerButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            :portal-container="container"
            side="top"
            align="center"
            class="w-35"
          >
            <DropdownMenuItem
              v-for="speed in speeds"
              :key="speed"
              :aria-current="speed === rate ? true : undefined"
              @select="emit('rate', speed)"
            >
              <span>{{ formatRate(speed) }}x</span>
              <Check v-if="speed === rate" class="ml-auto text-current" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <PlayerButton
          v-if="pipAvailable"
          label="画中画"
          :container="container"
          :disabled="!duration"
          @click="emit('pip')"
        >
          <PictureInPicture2 />
        </PlayerButton>
        <PlayerButton
          v-if="hasEpisodes"
          label="选集"
          :container="container"
          aria-haspopup="dialog"
          :aria-expanded="episodesOpen"
          :aria-controls="episodesOpen ? 'player-episodes-sheet' : undefined"
          @click="handleShowEpisodes"
        >
          <ListVideo />
        </PlayerButton>
        <PlayerButton
          v-if="fullscreenAvailable"
          :label="fullscreen ? '退出全屏' : '全屏'"
          :container="container"
          @click="emit('fullscreen')"
        >
          <Minimize v-if="fullscreen" />
          <Maximize v-else />
        </PlayerButton>
      </div>
    </div>
    <PlayerProgress
      :current-time="currentTime"
      :duration="duration"
      @seek="emit('seek', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  Check,
  Gauge,
  ListVideo,
  Maximize,
  Minimize,
  PictureInPicture2,
  SkipBack,
  SkipForward,
} from 'lucide-vue-next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import PlayerButton from './player-button.vue';
import PlayerProgress from './player-progress.vue';
import PlayerVolume from './player-volume.vue';
import { formatRemarks } from '@/lib/movie';
import { eventBus } from '@/utils/event-bus';

// 控制栏显示影片信息并反映真实媒体状态。
const props = defineProps<{
  name: string;
  episodeLabel: string;
  hasEpisodes: boolean;
  episodesOpen: boolean;
  currentTime: number;
  duration: number;
  rate: number;
  volume: number;
  fullscreen: boolean;
  container: HTMLElement | null;
  hasPrevious: boolean;
  hasNext: boolean;
  pipAvailable: boolean;
}>();

// 用户操作由页面接入播放器业务。
const emit = defineEmits<{
  seek: [seconds: number];
  rate: [speed: number];
  volume: [value: number];
  previous: [];
  next: [];
  pip: [];
  fullscreen: [];
  menuOpen: [open: boolean];
}>();

// 分别保留两个浮层状态，切换时不会误报控制栏已关闭。
const rateOpen = ref(false);

// 音量浮窗的打开状态。
const volumeOpen = ref(false);

// 任意浮层打开期间均保持全屏控制栏可见。
const menuOpen = computed(() => rateOpen.value || volumeOpen.value);

watch(menuOpen, (value) => emit('menuOpen', value));

// 与桌面端相同的倍速选项和排列。
const speeds = [4, 3, 2, 1, 0.75, 0.5, 0.25];

// 整数倍速补一位小数，其余倍速保留原有精度。
const formatRate = (speed: number) =>
  Number.isInteger(speed) ? speed.toFixed(1) : String(speed);

// 通过事件总线打开独立选集面板。
const handleShowEpisodes = () => {
  eventBus.emit('player-episodes:show');
};

// 浏览器原生全屏能力。
const fullscreenAvailable = document.fullscreenEnabled;

// 桌面端同款的影片名称与集数标题。
const label = computed(() =>
  [props.name, formatRemarks(props.episodeLabel)].filter(Boolean).join(' · '),
);
</script>

<style scoped>
.player-label {
  text-shadow: 0 1px 3px #000;
}
</style>
