<template>
  <div v-if="entry" class="flex items-center gap-2">
    <PlayerButton
      label="上一集"
      :disabled="entry.episode === 0"
      @click="selectEpisode(entry.episode - 1)"
    >
      <SkipBack />
    </PlayerButton>
    <PlayerButton
      label="下一集"
      :disabled="entry.episode >= entry.episodes.length - 1"
      @click="selectEpisode(entry.episode + 1)"
    >
      <SkipForward />
    </PlayerButton>
  </div>
</template>

<script setup lang="ts">
import { SkipBack, SkipForward } from 'lucide-vue-next';
import PlayerButton from './player-button.vue';
import { usePlayerContext } from '../context.ts';

// 相邻集操作直接使用当前影片的集数和切换入口。
const { entry, selectEpisode } = usePlayerContext().player;
</script>
