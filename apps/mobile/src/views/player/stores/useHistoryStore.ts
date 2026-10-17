import eventEmitter from "@/hooks/eventEmitter";
import { HistoryInfo, Progress } from "@/type";
import { getValue } from "@/utils/value";
import { derive } from "derive-valtio";
import { proxy } from "valtio";
import { setPlay } from "./useVideoStore";

type HistoryState = {
  data: HistoryInfo;

  progress: Progress;
};

//更新进度
interface UpdateProgressOption {
  currentTime?: number;
  duration?: number;
}

export const historyState = proxy<HistoryState>({
  data: {
    name: "",
    content: "",
    id: "",
    pic: "",
    history: 0,
    time: 0,
    year: "",
    area: "",
    lang: "",
    type: "",
    episodes: [],
    progress: [],
    remarks: "",
    source: {
      id: "",
      label: "",
      url: "",
    },
  },

  get progress() {
    return this.data.progress[this.data.history];
  },

  set progress(val: Progress) {
    this.data.progress[this.data.history] = val;
  },
});

export const historyDerivedState = derive({
  //播放进度百分比
  selectedEpisode: get => {
    const state = get(historyState);

    return state.data.episodes[state.data.history];
  },
});

//设置进度
export const setProgress = ({
  currentTime,
  duration,
}: UpdateProgressOption) => {
  if (!historyState.progress) {
    historyState.progress = { currentTime: 0, duration: 0 };
  }

  if (currentTime && currentTime > 1) {
    historyState.progress.currentTime = currentTime;
  }

  if (duration && duration > 1) {
    historyState.progress.duration = duration;
  }
};

//设置集数
export const setHistory = (value: number | ((history: number) => number)) => {
  setPlay(false);

  const res = getValue(value, historyState.data.history);

  historyState.data.history = res;
};

//保存数据
export const saveHistory = () => {
  eventEmitter.emit(
    "saveHistory",
    JSON.parse(JSON.stringify(historyState.data))
  );
};

//接受消息
eventEmitter.on("openPlayer", data => {
  historyState.data = JSON.parse(JSON.stringify(data));

  historyState.data.time = Date.now();
});
