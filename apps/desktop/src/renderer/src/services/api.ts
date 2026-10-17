import { useConfigStore } from "@manager/stores/useConfigStore";
import {
  Detail_Res_List,
  Detail_Res,
  MovieInfo,
  List_Res,
  Category,
} from "@type";
import { formatContent, formatRemarks, formatSub } from "@/utils/format";
import { request } from "@/utils/request";
import pinia from "@/stores";

//处理播放url
const formatEpisode = (urlStr: string, note?: string) => {
  if (note) {
    urlStr = urlStr.split(note).filter(item => item.includes("m3u8"))[0];
  }

  return urlStr.split("#").map((item, index) => {
    const [label, url] = item.split("$");

    return {
      label: formatRemarks(label),
      value: index,
      url,
      duration: 0,
      currentTime: 0,
    };
  });
};

//处理详情信息
const formatDetail = (data: Detail_Res_List[]): MovieInfo[] => {
  const configStore = useConfigStore(pinia);

  return data.map(item => ({
    name: item.vod_name,
    id: `${configStore.config.selectedSource.label},${item.vod_id}`,
    pic: item.vod_pic,
    area: formatSub(item.vod_area),
    lang: formatSub(item.vod_lang),
    type: item.type_name,
    content: formatContent(item.vod_content),
    year: formatSub(item.vod_year),
    episodes: formatEpisode(item.vod_play_url, item.vod_play_note),
    remarks: formatRemarks(item.vod_remarks),
    source: {
      id: String(item.vod_id),
      label: configStore.config.selectedSource.label,
      url: configStore.config.selectedSource.url,
    },
  }));
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
