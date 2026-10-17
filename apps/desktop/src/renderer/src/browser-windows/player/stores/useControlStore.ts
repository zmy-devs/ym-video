export const useControlStore = defineStore("player-control", () => {
  //控件是否可见
  const controlVisible = ref(true);

  let timer: number | null;

  //设置控件是否可见
  const setControlVisible = (value: boolean) => {
    controlVisible.value = value;
  };

  //清空计时器
  const clearTimer = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  //显示控件
  const showControl = () => {
    setControlVisible(true);

    clearTimer();
  };

  //隐藏控件
  const hideControl = () => {
    clearTimer();

    timer = window.setTimeout(() => {
      controlVisible.value = false;
    }, 2000);
  };

  //显示自动隐藏控件
  const showAndHideControl = () => {
    setControlVisible(true);

    hideControl();
  };

  return {
    controlVisible,
    hideControl,
    showControl,
    showAndHideControl,
  };
});
