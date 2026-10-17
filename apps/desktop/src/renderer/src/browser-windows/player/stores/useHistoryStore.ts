import { HistoryInfo, Progress } from "@type";
import { setSeek } from "./useProgressStore";
import { getValue } from "@/utils/value";
import { useVideoStore } from "./useVideoStore";

//更新进度
interface UpdateProgressOption {
  currentTime?: number;
  duration?: number;
}

export const useHistoryStore = defineStore("player-history", () => {
  const { setPlay } = useVideoStore();

  //当前历史
  const history = ref<HistoryInfo>({
    name: "",
    content: "",
    id: "",
    pic: "",
    history: 0,
    time: 0,
    progress: [],
    year: "",
    area: "",
    lang: "",
    type: "",
    episodes: [],
    remarks: "",
    source: {
      id: "",
      label: "",
      url: "",
    },
  });

  //选中的集数
  const selectedEpisode = computed(() => {
    return history.value.episodes[history.value.history];
  });

  //当前进度
  const progress = computed({
    get() {
      return history.value.progress[history.value.history];
    },
    set(val: Progress) {
      history.value.progress[history.value.history] = val;
    },
  });

  //设置进度
  const setProgress = ({ currentTime, duration }: UpdateProgressOption) => {
    if (!progress.value) {
      progress.value = { currentTime: 0, duration: 0 };
    }

    if (currentTime && currentTime > 1) {
      progress.value.currentTime = currentTime;
    }

    if (duration && duration > 1) {
      progress.value.duration = duration;
    }
  };

  //设置集数
  const setHistory = (value: number | ((history: number) => number)) => {
    //需要暂停解决进度条继承到其他集的bug
    setPlay(false);

    const res = getValue(value, history.value.history);

    history.value.history = res;
  };

  //保存数据
  const saveHistory = () => {
    history.value.time = Date.now();

    ipcRenderer.invoke("db:update", toRaw(history.value));
  };

  //接受消息
  ipcRenderer.on("openPlayer", (_, data, isReset) => {
    if (data.id == history.value.id) {
      isReset && setSeek(0);
      return;
    }

    //存在值就保存
    if (history.value.id) {
      saveHistory();
    }

    if (isReset) {
      data.progress[data.history].currentTime = 0;
    }

    history.value = data;
  });

  return {
    history,
    progress,
    selectedEpisode,
    setProgress,
    saveHistory,
    setHistory,
  };
});
