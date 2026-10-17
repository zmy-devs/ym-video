import { nativeApplicationVersion, applicationName } from "expo-application";

//使用最小的版本
export const minVersion = "1.7.0";

//当前版本
export const appVersion = nativeApplicationVersion as string;

//当前软件名称
export const appName = applicationName as string;
