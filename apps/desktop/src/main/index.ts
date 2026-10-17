import {
  isSecondeInstanceStart,
  onMounted,
  onSecondeInstanceMounted,
} from "ym-electron.js";
import { app } from "electron";
import { createManage } from "@/bw/manager";
import "@/ipc/index";

//禁止多开
if (isSecondeInstanceStart()) {
  app.exit();
}

onMounted(async () => {
  const win = await createManage();

  onSecondeInstanceMounted(() => {
    win.show();
  });
});
