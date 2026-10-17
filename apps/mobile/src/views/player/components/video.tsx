import { historyState, setProgress } from "@player/stores/useHistoryStore";
import Video, { OnLoadData, OnProgressData } from "react-native-video";
import { useSnapshot } from "valtio";
import { videoRef } from "../stores/useEl";
import {
  progressState,
  resetProgress,
  seekTo,
} from "../stores/useProgressStore";
import useM3u8 from "../hooks/useM3u8";
import { setLoading, setPlay, videoStore } from "../stores/useVideoStore";

export default function () {
  const { isPlay, rate, volume } = useSnapshot(videoStore);
  const { data, progress } = useSnapshot(historyState);
  const { uri } = useM3u8(data.episodes[data.history].url, [data.history]);

  //视频播放进度
  const onProgress = ({ currentTime }: OnProgressData) => {
    if (!isPlay) return;

    setProgress({
      currentTime,
    });

    progressState.currentTime = currentTime;
  };

  //视频加载完成
  const onLoad = ({ duration }: OnLoadData) => {
    setProgress({
      duration,
    });

    progressState.duration = duration;

    if (progress?.currentTime) {
      seekTo(progress.currentTime);
    }

    setPlay(true);
  };

  //加载完成
  const onLoadStart = () => {
    resetProgress();

    setLoading(true);
  };

  if (!uri) {
    return null;
  }

  return (
    <Video
      rate={rate}
      volume={volume / 100}
      paused={!isPlay}
      ref={videoRef}
      source={{
        uri,
        bufferConfig: {
          maxBufferMs: 1000 * 60 * 5,
          cacheSizeMB: 200,
        },
      }}
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#000",
      }}
      resizeMode="contain"
      onLoad={onLoad}
      onProgress={onProgress}
      onBuffer={({ isBuffering }) => setLoading(isBuffering)}
      onLoadStart={onLoadStart}
    />
  );
}
