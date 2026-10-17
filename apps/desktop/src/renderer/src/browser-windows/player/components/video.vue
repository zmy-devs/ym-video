<template>
  <video
    class="wh-full"
    ref="videoRef"
    @click="setPlay()"
    @timeupdate="handleTimeUpdate"
    @waiting="setLoading(true)"
    @canplay="setLoading(false)"
    @loadstart="handleLoadStart"
    @loadedmetadata="handleLoad"
  />
</template>

<script setup lang="ts">
import { videoRef } from "@player/stores/useEl";
import { useVideoStore } from "@player/stores/useVideoStore";
import { useHistoryStore } from "@player/stores/useHistoryStore";
import {
  currentTime,
  duration,
  resetProgress,
  setSeek,
} from "@player/stores/useProgressStore";

const { setLoading, setPlay } = useVideoStore();
const { progress } = storeToRefs(useHistoryStore());
const { setProgress } = useHistoryStore();

//获取播放事件
const handleTimeUpdate = () => {
  if (!videoRef.value) {
    return;
  }

  setProgress({
    currentTime: videoRef.value.currentTime,
  });

  currentTime.value = videoRef.value.currentTime;
};

//处理开始加载
const handleLoadStart = () => {
  resetProgress();
};

//处理加载完成
const handleLoad = () => {
  if (!videoRef.value) {
    return;
  }

  setProgress({
    duration: videoRef.value.duration,
  });

  duration.value = videoRef.value.duration;

  if (progress.value.currentTime) {
    setSeek(progress.value.currentTime);
  }

  setPlay(true);
};
</script>

<style scoped lang="scss"></style>
