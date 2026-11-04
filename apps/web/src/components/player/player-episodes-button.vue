<template>
  <PlayerButton
    v-if="available"
    label="选集"
    :container="container"
    @click="handleShowEpisodes"
  >
    <ListVideo />
  </PlayerButton>
</template>

<script setup lang="ts">
import { ListVideo } from 'lucide-vue-next';
import PlayerButton from './player-button.vue';
import { eventBus } from '@/utils/event-bus';

// 单集影片不显示选集入口。
defineProps<{ available: boolean; container: HTMLElement | null }>();

// 由播放器页的独立 Sheet 负责选集交互。
const handleShowEpisodes = () => eventBus.emit('player-episodes:show');
</script>
