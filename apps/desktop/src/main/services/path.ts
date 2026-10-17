import { app } from "electron";
import { join } from "path";

//useData
export const userDataPath = app.getPath("userData");

//下载更新目录
export const update = join(userDataPath, "update");

//更新文件
export const updatePath = join(update, "ym-video-update.exe");
