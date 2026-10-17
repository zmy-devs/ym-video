import { getCategory, getMovie } from "@/services/api";
import { Category, MovieInfo } from "@type";

type Status = "init" | "loading" | "empty" | "end" | "finish";

export const useMovieStore = defineStore("movie", () => {
  //分类
  const category = ref(new Map<number, Category>());

  //子分类
  const childCategory = ref(new Map<number, Category[]>());

  //选中的大分类
  const selectedCategoryID = ref(0);

  //选中的小分类
  const selectedChildCategoryID = ref(0);

  //分类数据
  const movies = ref<MovieInfo[]>([]);

  //当前页数
  const page = ref(0);

  //总共页数
  const pageCount = ref(0);

  //状态
  const status = ref<Status>("init");

  //获取分类标题
  const getCategoryLabel = (id: number | string) => {
    return category.value.get(Number(id))?.label;
  };

  //获取数据
  const getData = async () => {
    status.value = "loading";

    const res = await getMovie({
      tid: selectedChildCategoryID.value,
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

  //切换大分类
  const setCategory = (id: number) => {
    if (selectedCategoryID.value == id) {
      return;
    }

    selectedCategoryID.value = id;

    const item = childCategory.value.get(id);

    if (item) {
      setChildCategory(item[0].id);
      return;
    }

    setChildCategory(id);
  };

  //切换小分类
  const setChildCategory = async (id: number) => {
    //选择同一个分类
    if (selectedChildCategoryID.value == id) {
      return;
    }

    movies.value = [];

    selectedChildCategoryID.value = id;

    page.value = 0;

    const childCategoryData = await getData();

    //解决快速点击页面出现错乱的bug
    if (selectedChildCategoryID.value != id) {
      return;
    }

    movies.value = childCategoryData.data;

    pageCount.value = childCategoryData.pageCount;
  };

  //加载更多数据
  const loadData = async () => {
    if (movies.value.length == 0) {
      return;
    }

    if (page == pageCount) {
      return;
    }

    const { data } = await getData();

    movies.value.push(...data);
  };

  //重置
  const reset = () => {
    category.value.clear();

    childCategory.value.clear();

    selectedCategoryID.value = 0;

    selectedChildCategoryID.value = 0;

    movies.value = [];

    page.value = 0;

    pageCount.value = 0;

    status.value = "init";
  };

  const init = async () => {
    reset();

    status.value = "loading";

    const categoryData = await getCategory();

    category.value = categoryData.category;

    childCategory.value = categoryData.childCategory;

    setCategory(categoryData.firstID);
  };

  return {
    movies,
    category,
    childCategory,
    status,
    selectedCategoryID,
    selectedChildCategoryID,
    init,
    setCategory,
    setChildCategory,
    loadData,
    getCategoryLabel,
  };
});
