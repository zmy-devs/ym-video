<template>
  <div
    ref="root"
    data-slot="pull-refresh"
    :data-refreshing="refreshing || undefined"
    :class="!disabled && 'pull-refresh-enabled'"
    class="relative min-h-0"
    @touchstart.passive="handleTouchStart"
    @touchend="handleTouchEnd"
    @touchcancel="resetPull"
    @click.capture="handleClick"
  >
    <slot />
    <div
      data-slot="pull-refresh-indicator"
      class="pointer-events-none absolute top-[var(--mobile-header-height)] left-1/2 z-40 -ml-5 flex size-10 items-center justify-center rounded-full bg-popover text-primary shadow-md"
      :class="
        !pulling &&
        'transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-opacity'
      "
      :style="indicatorStyle"
    >
      <RotateCw
        class="size-5"
        :class="
          refreshing && 'motion-safe:animate-spin motion-reduce:animate-pulse'
        "
        :style="!refreshing && { transform: `rotate(${distance * 5}deg)` }"
      />
    </div>
    <span class="sr-only" role="status">
      {{ refreshing ? '正在刷新' : '' }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, onDeactivated, ref, useTemplateRef, watch } from 'vue';
import { useEventListener } from '@vueuse/core';
import { RotateCw } from 'lucide-vue-next';

// 页面提供刷新任务，组件负责触顶手势和圆形加载反馈。
const props = defineProps<{
  refresh: () => Promise<unknown>;
  disabled?: boolean;
}>();

// 触摸事件绑定到当前页面，缓存页面之间不共享手势。
const root = useTemplateRef<HTMLElement>('root');

// 圆球下移到 64px 时，松手执行刷新。
const threshold = 64;

// 手指拖动距离经过阻尼后决定圆球位置和图标转角。
const distance = ref(0);

// 拖动时即时跟手，释放后启用收起动画。
const pulling = ref(false);

// 同一页面的刷新任务执行期间不重复触发。
const refreshing = ref(false);

// 起点和实际滚动视口用于判断是否接管纵向下拉。
let gesture: { x: number; y: number; viewport: HTMLElement | null } | undefined;

// 已接管的拖动不再触发海报链接的后续点击。
let suppressClick = false;

// 圆球从标题下方浮现，保留页面内容和滚动位置。
const indicatorStyle = computed(() => ({
  opacity: props.disabled ? 0 : Math.min(distance.value / 24, 1),
  transform: `translateY(${distance.value - 48}px)`,
}));

// 松手不足阈值、触摸取消或离开页面时收起圆球。
const resetPull = () => {
  gesture = undefined;
  pulling.value = false;

  if (!refreshing.value) {
    distance.value = 0;
  }
};

// 只在单指从当前滚动视口顶部开始时记录手势。
const handleTouchStart = (event: TouchEvent) => {
  suppressClick = false;

  if (props.disabled || refreshing.value || event.touches.length !== 1) {
    if (!refreshing.value) {
      resetPull();
    }

    return;
  }

  resetPull();

  // ScrollArea 内部视口负责滚动，空页面则以组件本身为顶部。
  const viewport =
    event.target instanceof Element
      ? event.target.closest<HTMLElement>('[data-slot="scroll-area-viewport"]')
      : null;

  if (viewport && viewport.scrollTop > 0) {
    return;
  }

  gesture = {
    x: event.touches[0].clientX,
    y: event.touches[0].clientY,
    viewport,
  };
};

// 先区分横向滑动和纵向下拉，再阻止滚动并更新圆球。
const handleTouchMove = (event: TouchEvent) => {
  if (!gesture) {
    return;
  }

  if (
    props.disabled ||
    event.touches.length !== 1 ||
    !event.cancelable ||
    (gesture.viewport && gesture.viewport.scrollTop > 0)
  ) {
    resetPull();
    return;
  }

  // 起手方向超过 10px 后锁定，分类横滑和正常上滚继续交给浏览器。
  const deltaX = event.touches[0].clientX - gesture.x;
  const deltaY = event.touches[0].clientY - gesture.y;

  if (!pulling.value) {
    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 10) {
      return;
    }

    if (deltaY <= 0 || Math.abs(deltaX) >= deltaY) {
      resetPull();
      return;
    }

    pulling.value = true;
  }

  event.preventDefault();
  suppressClick = true;
  distance.value = Math.min(88, Math.max(0, deltaY) * 0.5);
};

// 达到阈值后保持圆球并等待页面请求结束，失败也会正常收起。
const handleTouchEnd = async () => {
  // 释放前检查实际拖动量，轻拉只回弹。
  const shouldRefresh =
    !props.disabled &&
    !refreshing.value &&
    pulling.value &&
    distance.value >= threshold;

  gesture = undefined;
  pulling.value = false;

  if (!shouldRefresh) {
    if (!refreshing.value) {
      distance.value = 0;
    }

    return;
  }

  refreshing.value = true;
  distance.value = threshold;

  try {
    await props.refresh();
  } finally {
    refreshing.value = false;
    distance.value = 0;
  }
};

// 阻止拖动后的触屏点击，键盘激活和下一次正常触摸保持可用。
const handleClick = (event: MouseEvent) => {
  if (!suppressClick || event.detail === 0) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  suppressClick = false;
};

useEventListener(root, 'touchmove', handleTouchMove, { passive: false });

watch(() => props.disabled, resetPull);

onDeactivated(resetPull);
</script>

<style scoped>
.pull-refresh-enabled :deep([data-slot='scroll-area-viewport']) {
  overscroll-behavior-y: contain;
}
</style>
