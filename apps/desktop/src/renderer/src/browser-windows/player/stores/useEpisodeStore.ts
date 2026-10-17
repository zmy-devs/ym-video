import { useHistoryStore } from "./useHistoryStore";

export const useEpisodeStore = defineStore("player-episode", () => {
  const { history } = storeToRefs(useHistoryStore());

  const MAX = 50;

  //当前页
  const currentPage = ref(0);

  //总页数
  const pageCount = computed(() => {
    return Math.ceil(history.value.episodes.length / MAX);
  });

  //分页表
  const pageList = computed(() => {
    return Array.from({ length: pageCount.value }, (_, i) => {
      const start = i * MAX + 1;
      const end = Math.min((i + 1) * MAX, history.value.episodes.length);

      return {
        label: `${start}-${end}`,
        value: i,
      };
    });
  });

  //监控当前页改变
  watch(
    () => history.value.history,
    val => {
      currentPage.value = Math.floor(val / MAX);
    },
    {
      immediate: true,
    }
  );

  return {
    currentPage,
    pageCount,
    pageList,
    MAX,
  };
});
