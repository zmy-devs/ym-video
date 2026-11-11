<template>
  <header
    class="mobile-header mobile-safe-top relative flex h-[var(--mobile-header-height)] shrink-0 items-center border-b px-3"
    :class="[
      overlay && 'mobile-header-overlay',
      !overlay && scrolled ? 'border-border' : 'border-transparent',
    ]"
  >
    <div class="mobile-header-blur" aria-hidden="true">
      <span
        v-for="layer in blurLayers"
        :key="layer.blur"
        class="mobile-header-blur-layer motion-safe:transition-opacity motion-safe:duration-150"
        :style="{
          '--mobile-header-blur': `${layer.blur}px`,
          '--mobile-header-mask-start': `${layer.start}%`,
          '--mobile-header-mask-end': `${layer.end}%`,
          opacity: scrolled ? 1 : 0,
        }"
      />
    </div>
    <div
      class="relative z-10 flex min-w-0 flex-1 self-stretch items-center gap-3"
    >
      <slot />
    </div>
  </header>
</template>

<script setup lang="ts">
import { useMobileStatusBar } from '@/composables/use-mobile-status-bar';

// 标题栏统一承载渐进模糊，页面通过插槽提供内容。
const props = withDefaults(
  defineProps<{ scrolled: boolean; overlay?: boolean }>(),
  { overlay: true },
);

// 当前显示的标题栏根据内容位置同步手机状态栏。
useMobileStatusBar(() => props.scrolled);

// 按高斯模糊的方差叠加强度，将整个区域从 18px 到透明的过渡均分为 12 档。
const blurLayers = Array.from({ length: 12 }, (_, index) => ({
  blur: Math.sqrt(2 * index + 1) * 1.5,
  start: 100 - ((index + 1) * 100) / 12,
  end: 100 - (index * 100) / 12,
}));
</script>

<style scoped>
.mobile-header {
  isolation: isolate;
}

.mobile-header-overlay {
  position: sticky;
  top: 0;
  z-index: 50;
  margin-bottom: calc(0px - var(--mobile-header-height));
}

.mobile-header-blur {
  position: absolute;
  inset: 0 0 auto;
  z-index: 0;
  height: calc(var(--mobile-header-height) + 8px);
  pointer-events: none;
}

.mobile-header-blur-layer {
  --mobile-header-mask: linear-gradient(
    to bottom,
    #000 var(--mobile-header-mask-start),
    transparent var(--mobile-header-mask-end)
  );
  position: absolute;
  inset: 0;
  -webkit-backdrop-filter: blur(var(--mobile-header-blur));
  backdrop-filter: blur(var(--mobile-header-blur));
  -webkit-mask-image: var(--mobile-header-mask);
  mask-image: var(--mobile-header-mask);
}
</style>
