import { MovieInfo } from "@/type";
import { proxy } from "valtio";
import { getSearch } from "@/services/api";

type SearchMovieState = {
  keyword: string;

  data: MovieInfo[];

  page: number;

  pageCount: number;

  status: "init" | "loading" | "finish" | "end" | "empty";
};

const createState = (): SearchMovieState => {
  return {
    //搜索关键词
    keyword: "",

    //搜索结果
    data: [],

    //当前页
    page: 0,

    //总页数
    pageCount: 0,

    //状态
    status: "init",
  };
};

//仓库
export const searchMovieState = proxy<SearchMovieState>(createState());

//获取数据
const getData = async () => {
  searchMovieState.status = "loading";

  const res = await getSearch({
    keyword: searchMovieState.keyword,
    page: ++searchMovieState.page,
  });

  //如果没有资源
  if (res.pageCount == 0) {
    searchMovieState.status = "empty";

    return res;
  }

  //所有资源请求完成
  if (searchMovieState.page == res.pageCount) {
    searchMovieState.status = "end";

    return res;
  }

  searchMovieState.status = "finish";

  return res;
};

//搜索
export const searchData = async (keyword: string) => {
  if (searchMovieState.keyword == keyword) {
    return;
  }

  searchMovieState.data = [];

  searchMovieState.keyword = keyword;

  searchMovieState.page = 0;

  const { data, pageCount } = await getData();

  searchMovieState.data = data;

  searchMovieState.pageCount = pageCount;
};

//加载更多
export const loadData = async () => {
  if (searchMovieState.data.length == 0) {
    return;
  }

  if (searchMovieState.page == searchMovieState.pageCount) {
    return;
  }

  const { data } = await getData();

  searchMovieState.data.push(...data);
};
