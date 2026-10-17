<template>
  <section
    class="progress-bar w-full h-1.5 flex items-center relative rounded-full cursor-pointer"
    @mousemove="handleMousemove"
    @mouseenter="showSeek"
    @mouseleave="hideSeek"
    @click="handleClick"
    ref="progress-bar"
  >
    <div class="wh-full rounded-full overflow-hidden">
      <div class="progress-bar-play h-full bg-main"></div>
    </div>

    <ProgressTip :x="tipX" :label="tipLabel" />
  </section>
</template>

<script setup lang="ts">
import { formatSeconde } from "@/utils/format";
import ProgressTip from "./progress-tip.vue";
import {
  showSeek,
  hideSeek,
  setSeek,
  currentTimePrecent,
  duration,
} from "@player/stores/useProgressStore";
import { useVideoStore } from "@player/stores/useVideoStore";

const { setPlay } = useVideoStore();

const progressRef = useTemplateRef("progress-bar");

//水平位移
const tipX = ref(0);

//当前鼠标悬浮的秒数
const seconde = ref(0);

//显示内容
const tipLabel = computed(() => {
  return formatSeconde(seconde.value);
});

//处理鼠标移动
const handleMousemove = (e: MouseEvent) => {
  if (!progressRef.value) {
    return;
  }

  const rect = progressRef.value.getBoundingClientRect();

  tipX.value = e.clientX - rect.left;

  seconde.value = (tipX.value / progressRef.value.clientWidth) * duration.value;
};

//处理点击跳转
const handleClick = () => {
  setSeek(seconde.value);

  setPlay(true);
};
</script>

<style scoped lang="scss">
.progress-bar {
  background-color: rgba(100, 100, 100, 0.8);
  box-shadow: 0 1px 5px 0 rgba(#000, 0.5);

  .progress-bar-play {
    width: calc(v-bind("currentTimePrecent") * 1%);

    transition: width 0.1s;
  }
}
</style>
