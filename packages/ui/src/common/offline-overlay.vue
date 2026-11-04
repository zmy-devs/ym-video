<template>
  <Overlay data-slot="offline-overlay">
    <Empty class="flex-none">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <WifiOff />
        </EmptyMedia>
        <EmptyTitle>网络已断开</EmptyTitle>
        <EmptyDescription>
          请检查网络连接，联网后提示会自动关闭。
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  </Overlay>
</template>

<script setup lang="ts">
import { WifiOff } from 'lucide-vue-next';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '../components/empty';
import Overlay from './overlay.vue';
</script>
