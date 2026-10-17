import { createRouter, createWebHashHistory } from "vue-router";
import ManagerRoute from "@manager/router";
import PlayerRoute from "@player/router";
import Network from "@/views/network.vue";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    ManagerRoute,
    PlayerRoute,
    {
      path: "/network",
      component: Network,
    },
  ],
});

export default router;
