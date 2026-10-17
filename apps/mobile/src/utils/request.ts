import { configState } from "@/stores/useConfigStore";

interface Option {
  url?: string;
  query?: Record<string, any>;
}

export const request = async <T>({
  url,
  query = {},
}: Option = {}): Promise<T> => {
  const str = new URLSearchParams(query).toString();

  const response = await fetch(
    `${url || configState.selectedSource.url}?${str}`
  );

  return await response.json();
};
