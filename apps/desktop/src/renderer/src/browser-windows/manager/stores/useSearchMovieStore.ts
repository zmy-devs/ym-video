import { MovieInfo } from "@type";
import { getSearch } from "@/services/api";

type Status = "init" | "loading" | "finish" | "end" | "empty";

export const useSearchMovieStore = defineStore("manager-search-movie", () => {
  const searchMovies = ref<MovieInfo[]>([]);

  const keyword = ref("");

  const page = ref(0);

  const pageCount = ref(0);

  const status = ref<Status>("init");

  //获取数据
  const getData = async () => {
    status.value = "loading";

    const res = await getSearch({
      keyword: keyword.value,
      page: ++page.value,
    });

    //如果没有资源
    if (res.pageCount == 0) {
      status.value = "empty";

      return res;
    }

    //所有资源请求完成
    if (page.value == res.pageCount) {
      status.value = "end";

      return res;
    }

    status.value = "finish";

    return res;
  };

  //搜索
  const searchData = async (kw: string) => {
    searchMovies.value = [];

    keyword.value = kw;

    page.value = 0;

    const res = await getData();

    searchMovies.value = res.data;

    pageCount.value = res.pageCount;
  };

  //加载更多
  const loadData = async () => {
    if (searchMovies.value.length == 0) {
      return;
    }

    if (page.value == pageCount.value) {
      return;
    }

    const res = await getData();

    searchMovies.value.push(...res.data);
  };

  return {
    searchMovies,
    keyword,
    page,
    pageCount,
    status,
    searchData,
    loadData,
  };
});
