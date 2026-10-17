export default (delay: number, init: boolean = false) => {
  const visible = ref(init);

  let timer: number;

  const show = () => {
    visible.value = true;

    clearTimeout(timer);

    timer = window.setTimeout(() => {
      hide();
    }, delay);
  };

  const hide = () => {
    visible.value = false;
  };

  return {
    visible,
    show,
  };
};
