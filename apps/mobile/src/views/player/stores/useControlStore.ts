import { proxy } from "valtio";

export const controlStore = proxy({
  visible: true,
});

let timer: number;

//展示控件模块
export const showControl = (delay: number = 5000) => {
  controlStore.visible = true;

  clearTimeout(timer);

  timer = setTimeout(() => {
    hideControl();
  }, delay);
};

//隐藏控件模块
export const hideControl = () => {
  controlStore.visible = false;
};

//切换
export const toggleControl = () => {
  clearTimeout(timer);

  if (controlStore.visible) {
    hideControl();
    return;
  }

  showControl();
};
