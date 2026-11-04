<template>
  <PlayerButton
    v-if="available"
    :label="fullscreen ? '退出全屏' : '全屏'"
    :container="container"
    @click="emit('toggle')"
  >
    <Minimize v-if="fullscreen" />
    <Maximize v-else />
  </PlayerButton>
</template>

<script setup lang="ts">
import { Maximize, Minimize } from 'lucide-vue-next';
import PlayerButton from './player-button.vue';

// 浏览器是否提供全屏及当前全屏状态。
defineProps<{
  available: boolean;
  fullscreen: boolean;
  container: HTMLElement | null;
}>();

// 通知播放器切换全屏状态。
const emit = defineEmits<{ toggle: [] }>();
</script>
