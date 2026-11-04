<template>
  <div class="flex items-center gap-2">
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
  </div>
</template>

<script setup lang="ts">
import { SkipBack, SkipForward } from 'lucide-vue-next';
import PlayerButton from './player-button.vue';

// 当前集前后相邻的可播放选项。
defineProps<{
  hasPrevious: boolean;
  hasNext: boolean;
  container: HTMLElement | null;
}>();

// 集数切换交由播放器业务处理。
const emit = defineEmits<{ previous: []; next: [] }>();
</script>
