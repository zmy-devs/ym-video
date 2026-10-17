import { IconName } from "./components/icon";

//暴风资源list返回值
export type List_Res = {
  class: List_Res_Class[];
};

//分类
export type List_Res_Class = {
  type_id: number;
  type_pid: number;
  type_name: string;
};

//暴风资源detail返回值
export type Detail_Res = {
  total: number;
  pagecount: number;
  page: number;
  list: Detail_Res_List[];
};

//详情列表
export type Detail_Res_List = {
  vod_content: string;
  vod_id: number;
  vod_duration: string;
  vod_name: string;
  vod_pic: string;
  vod_play_url: string;
  vod_year: string;
  vod_area: string;
  vod_lang: string;
  type_name: string;
  vod_remarks: string;
  vod_play_from: string;
  vod_douban_score: string;
  vod_play_note: string;
};

//选集
export type Episode = {
  label: string;
  value: number;
  url: string;
};

//进度
export type Progress = {
  duration: number;
  currentTime: number;
};

//视频信息
export type HistoryInfo = MovieInfo & {
  history: number;
  time: number;
  progress: Progress[];
};

//电影信息
export type MovieInfo = {
  name: string;
  content: string;
  id: string;
  pic: string;
  year: string;
  area: string;
  lang: string;
  type: string;
  episodes: Episode[];
  remarks: string;
  source: {
    id: string;
    label: string;
    url: string;
  };
};

//更新信息
export type UpdateInfo = {
  id: string;
  url: Episode[];
  remarks: string;
};

//搜索历史
export type KeywordHistory = {
  time: number;
  label: string;
};

//分类
export type Category = {
  label: string;
  id: number;
};

//设置
export type SetItem = {
  label: string;
  sub?: string;
  icon?: IconName;
  onPress?: () => void;
};

//源
export type Source = {
  label: string;
  url: string;
};

//仓库
export type Repo = {
  label: string;
  url: string;
  updateUrl: string;
};
