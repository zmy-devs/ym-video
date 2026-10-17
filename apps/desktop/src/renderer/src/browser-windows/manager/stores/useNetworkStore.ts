export const useNetworkStore = defineStore("manager-network", () => {
  const onLine = ref(true);

  const init = () => {
    window.addEventListener("online", () => {
      onLine.value = true;
    });

    window.addEventListener("offline", () => {
      onLine.value = false;
    });
  };

  init();

  return {
    onLine,
  };
});
