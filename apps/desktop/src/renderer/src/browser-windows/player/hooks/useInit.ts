import Hls from "hls.js";
import { videoRef } from "../stores/useEl";
import { getSource } from "./useM3u8";
import { useHistoryStore } from "@player/stores/useHistoryStore";

export const useInit = () => {
  const { selectedEpisode } = storeToRefs(useHistoryStore());

  //hls实例
  const hls = new Hls({
    startFragPrefetch: true,
    maxBufferLength: 5 * 60,
    maxBufferSize: 1024 * 1024 * 200,
  });

  //加载完成播放
  hls.on(Hls.Events.MANIFEST_PARSED, () => {
    hls.currentLevel = hls.levels.length - 1;
  });

  //切换播放链接
  watch(
    selectedEpisode,
    async val => {
      if (!val) return;

      //解决点击不能快速切换的bug
      hls.loadSource("");

      const url = await getSource(val.url);

      hls.loadSource(url);
    },
    {
      immediate: true,
    }
  );

  onMounted(() => {
    hls.attachMedia(videoRef.value!);
  });

  onUnmounted(() => {
    hls.destroy();
  });
};
