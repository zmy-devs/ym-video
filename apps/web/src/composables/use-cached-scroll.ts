import { computed, nextTick, onActivated, onDeactivated, ref } from 'vue';

// 缓存页面恢复原来的纵向滚动位置，并标记是否正在显示。
export const useCachedScroll = () => {
  // 只有当前显示的页面记录滚动和触发列表加载。
  const active = ref(true);

  // 页面停用期间保留最后一次滚动位置。
  let viewport: HTMLElement | undefined;
  const scrollTop = ref(0);

  // 缓存视口位置同时驱动移动端标题栏与状态栏。
  const scrolled = computed(() => scrollTop.value > 0);

  // 忽略隐藏页面和分类按钮的横向滚动。
  const handleScroll = (event: Event) => {
    if (
      !active.value ||
      !(event.target instanceof HTMLElement) ||
      event.target.dataset.slot !== 'scroll-area-viewport'
    ) {
      return;
    }

    viewport = event.target;
    scrollTop.value = viewport.scrollTop;
  };

  // 新查询和重新进入页面时同时清空缓存位置与实际视口。
  const resetScroll = () => {
    scrollTop.value = 0;
    viewport?.scrollTo({ top: 0 });
  };

  onDeactivated(() => {
    active.value = false;
  });

  // 等待外层页面显示后再恢复位置，播放器返回时视口才有实际高度。
  onActivated(async () => {
    await nextTick();

    if (viewport) {
      viewport.scrollTop = scrollTop.value;
    }

    active.value = true;
  });

  return { active, scrolled, handleScroll, resetScroll };
};
