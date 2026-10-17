declare global {
  const __APP_VERSION__: string;
}

//使用最小的版本
export const minVersion = "5.0.0";

//当前版本
export const appVersion = __APP_VERSION__ as string;
