<template>
  <PlayerButton
    v-if="available"
    label="画中画"
    :container="container"
    :disabled="disabled"
    @click="emit('pip')"
  >
    <PictureInPicture2 />
  </PlayerButton>
</template>

<script setup lang="ts">
import { PictureInPicture2 } from 'lucide-vue-next';
import PlayerButton from './player-button.vue';

// 浏览器能力和当前媒体时长决定按钮状态。
defineProps<{
  available: boolean;
  disabled: boolean;
  container: HTMLElement | null;
}>();

// 请求播放器切换画中画。
const emit = defineEmits<{ pip: [] }>();
</script>
