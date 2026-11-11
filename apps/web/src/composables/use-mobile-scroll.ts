import { ref } from 'vue';

// 页面壳记录纵向滚动状态，忽略横向导航的滚动。
export const useMobileScroll = () => {
  // 内容离开顶部时启用标题栏模糊与暗色状态栏。
  const scrolled = ref(false);

  // 捕获实际内容容器的纵向滚动。
  const handleScroll = (event: Event) => {
    const target = event.target;

    if (
      !(target instanceof HTMLElement) ||
      target.scrollHeight <= target.clientHeight
    ) {
      return;
    }

    scrolled.value = target.scrollTop > 0;
  };

  // 缓存页面恢复后，读取实际视口位置同步标题栏。
  const handlePageEnter = (element: Element) => {
    const viewport = element.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]',
    );

    scrolled.value = (viewport?.scrollTop ?? element.scrollTop) > 0;
  };

  return { scrolled, handleScroll, handlePageEnter };
};
