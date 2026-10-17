import { useConfigStore } from "@manager/stores/useConfigStore";

interface Option {
  url?: string;
  query?: Record<string, any>;
}

export const request = async <T>({
  url,
  query = {},
}: Option = {}): Promise<T> => {
  const configStore = useConfigStore();

  const params = new URLSearchParams(query).toString();

  return await ipcRenderer.invoke(
    "request",
    `${url || configStore.config.selectedSource.url}?${params}`
  );
};
