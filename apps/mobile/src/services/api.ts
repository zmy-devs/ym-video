import { configState } from "@/stores/useConfigStore";
import { parseMovie } from "@ym-video/catalog";
import {
  Detail_Res_List,
  Detail_Res,
  MovieInfo,
  List_Res,
  Category,
} from "@/type";
import { formatContent, formatRemarks, formatSub } from "@/utils/format";
import { request } from "@/utils/request";

//处理详情信息
const formatDetail = (data: Detail_Res_List[]): MovieInfo[] => {
  const { label, url } = configState.selectedSource;

  return data.flatMap(item => {
    const playUrl = item.vod_play_note
      ? item.vod_play_url
          .split(item.vod_play_note)
          .find(value => value.includes("m3u8")) || ""
      : item.vod_play_url;
    const movie = parseMovie(item, url, { playUrl });

    if (!movie) {
      return [];
    }

    return [{
      name: movie.name,
      id: `${label},${movie.vodId}`,
      pic: movie.pic,
      area: formatSub(movie.area),
      lang: formatSub(movie.lang),
      type: movie.category,
      content: formatContent(movie.content),
      year: formatSub(movie.year),
      episodes: movie.episodes.map((episode, index) => ({
        label: formatRemarks(episode.label),
        value: index,
        url: episode.url,
        duration: 0,
        currentTime: 0,
      })),
      remarks: formatRemarks(movie.remarks),
      source: {
        id: movie.vodId,
        label,
        url,
      },
    }];
  });
};

interface GetMovieOption {
  tid: string | number;
  page?: number;
}

//获取影视
export const getMovie = async ({ tid, page = 1 }: GetMovieOption) => {
  //获取基本信息
  const { list, pagecount } = await request<Detail_Res>({
    query: {
      ac: "detail",
      t: tid,
      pg: page,
    },
  });

  return {
    data: formatDetail(list),
    pageCount: pagecount,
  };
};

interface GetSearchOption {
  keyword: string;
  page?: number;
}

//搜索
export const getSearch = async ({ keyword, page }: GetSearchOption) => {
  const { list, pagecount } = await request<Detail_Res>({
    query: {
      ac: "detail",
      pg: page,
      wd: keyword,
    },
  });

  return {
    data: formatDetail(list),
    pageCount: pagecount,
  };
};

//获取分类
export const getCategory = async (url?: string) => {
  const res = await request<List_Res>({ url });

  const category = new Map<number, Category>();

  const childCategory = new Map<number, Category[]>();

  for (const item of res.class) {
    //分类
    if (item.type_pid == 0) {
      category.set(item.type_id, {
        label: item.type_name,
        id: item.type_id,
      });
    }

    if (!childCategory.has(item.type_pid)) {
      childCategory.set(item.type_pid, []);
    }

    childCategory.get(item.type_pid)!.push({
      label: item.type_name,
      id: item.type_id,
    });
  }

  return {
    firstID: res.class[0].type_id,
    category,
    childCategory,
  };
};

//获取最近更新
export const getLastMovie = async () => {
  //获取基本信息
  const { list } = await request<Detail_Res>({
    query: {
      ac: "detail",
    },
  });

  return formatDetail(list);
};

//获取更新状态
export const getUpdate = async (source: string, ids: string[]) => {
  const res: Detail_Res_List[] = [];

  const getEpisode = async (page: number = 1) => {
    const { list, pagecount } = await request<Detail_Res>({
      url: source,
      query: {
        ac: "detail",
        ids: ids.join(","),
        pg: page,
      },
    });

    res.push(...list);

    if (pagecount == page) {
      return;
    }

    await getEpisode(page + 1);
  };

  await getEpisode();

  return formatDetail(res);
};
