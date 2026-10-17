import { render } from "vue";
import Dialog from "./index.vue";

export const data = reactive({
  label: "",
  content: "",
  confirmButtonText: "",
  cancelButtonText: "",

  visible: false,
  onConfirm: () => {},
  onCancel: () => {},
});

export interface ConfirmOption {
  label: string;
  content: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
}

let isCreate = false;

export const confirm = (option: ConfirmOption) => {
  const { promise, resolve } = Promise.withResolvers<boolean>();

  Object.assign(data, {
    ...option,
    visible: true,
    onConfirm: () => {
      resolve(true);
    },
    onCancel: () => {
      resolve(false);
    },
  });

  //有缓存
  if (isCreate) {
    return promise;
  }

  isCreate = true;

  const container = document.createElement("div");

  document.body.appendChild(container);

  const vnode = h(Dialog);

  render(vnode, container);

  return promise;
};
