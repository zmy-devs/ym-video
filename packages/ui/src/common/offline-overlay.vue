<template>
  <Overlay data-slot="offline-overlay">
    <CommonEmpty
      class="flex-none"
      label="网络已断开"
      description="请检查网络连接，联网后提示会自动关闭。"
      :icon="WifiOff"
    />
  </Overlay>
</template>

<script setup lang="ts">
import { WifiOff } from 'lucide-vue-next';
import CommonEmpty from './empty.vue';
import Overlay from './overlay.vue';
</script>
