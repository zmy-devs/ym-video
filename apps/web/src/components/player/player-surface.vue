<template>
  <div
    class="player-page dark relative flex h-full flex-col overflow-hidden bg-background"
    :class="{ 'player-mobile': mobile }"
  >
    <TooltipProvider :disabled="mobile">
      <slot v-if="!mobile" name="header" />
      <div class="min-h-0 flex flex-1">
        <main
          ref="container"
          class="player-surface relative isolate flex min-w-0 flex-1 flex-col items-center justify-center overflow-hidden bg-black text-white outline-none"
          :class="{ 'cursor-none': fullscreen && !controlsVisible && playing }"
          tabindex="-1"
          @pointermove="handlePointerMove"
          @pointerleave="emit('schedule-hide')"
        >
          <slot name="video" />
          <CommonEmpty
            v-if="error"
            label="播放失败"
            :description="error"
            action="重新加载"
            :icon="CircleAlert"
            class="absolute inset-0 rounded-none bg-black/90"
            @action="emit('retry')"
          />
          <div
            v-else-if="status === 'loading' || status === 'buffering'"
            data-slot="player-loading"
            class="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <LoaderCircle class="size-10 animate-spin drop-shadow-md" />
          </div>
          <button
            v-else-if="status === 'paused' && !seeking"
            type="button"
            aria-label="播放"
            class="absolute flex items-center justify-center text-white drop-shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            @click="emit('toggle')"
          >
            <Play class="size-20 fill-current" />
          </button>
          <div
            class="player-overlay pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
          >
            <slot v-if="mobile" name="header" />
            <slot name="overlay" />
            <div
              class="pointer-events-auto absolute bottom-0 left-0 z-10 w-full"
              @pointerenter="emit('keep-controls')"
              @pointerleave="emit('schedule-hide')"
              @pointermove="emit('keep-controls')"
              @focusin="emit('keep-controls')"
              @focusout="emit('schedule-hide')"
            >
              <slot name="controls" :visible="controlsVisible" />
            </div>
          </div>
          <div
            v-if="!controlsVisible"
            data-slot="player-mini-progress"
            class="player-mini-progress pointer-events-none fixed bottom-0 z-10 h-[3px] bg-[var(--player-control)]"
          >
            <div
              class="h-full bg-primary"
              :style="{ width: `${progressPercent}%` }"
            />
          </div>
          <slot />
        </main>
      </div>
    </TooltipProvider>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { CircleAlert, LoaderCircle, Play } from 'lucide-vue-next';
import CommonEmpty from '@ym-video/ui/common/empty.vue';
import { TooltipProvider } from '@ym-video/ui/components/tooltip';

// PC 与 Mobile 共用视频区的状态渲染和控制层定位。
defineProps<{
  status: 'loading' | 'buffering' | 'playing' | 'paused' | 'error';
  error: string;
  playing: boolean;
  controlsVisible: boolean;
  fullscreen: boolean;
  mobile?: boolean;
  seeking?: boolean;
  progressPercent: number;
}>();

const emit = defineEmits<{
  'show-controls': [];
  'schedule-hide': [];
  'keep-controls': [];
  retry: [];
  toggle: [];
  'container-ready': [element: HTMLElement];
}>();

const container = ref<HTMLElement | null>(null);

// 仅鼠标移动唤出控件，触屏交互由轻触与滑动手势处理。
const handlePointerMove = (event: PointerEvent) => {
  if (event.pointerType === 'mouse') {
    emit('show-controls');
  }
};

onMounted(() => {
  if (container.value) {
    emit('container-ready', container.value);
  }
});
</script>

<style scoped>
.player-overlay {
  transform: translateZ(0);
}

/* 画面覆盖整个屏幕，控件按状态栏安全距离预留左右空间。 */
.player-mobile {
  --player-safe-x: max(
    env(safe-area-inset-top, 0px),
    env(safe-area-inset-left, 0px),
    env(safe-area-inset-right, 0px)
  );
  background-color: #000;
}

.player-mobile .player-overlay {
  inset-inline: var(--player-safe-x);
}

.player-mobile :deep([data-slot='sheet-content']) {
  right: var(--player-safe-x);
}

.player-mini-progress {
  inset-inline: var(--player-safe-x, 0px);
}

.player-surface:fullscreen {
  width: 100%;
  height: 100%;
}

.player-page {
  --player-control: rgb(100 100 100 / 80%);
  --player-shadow: 0 1px 5px rgb(0 0 0 / 50%);
}
</style>
