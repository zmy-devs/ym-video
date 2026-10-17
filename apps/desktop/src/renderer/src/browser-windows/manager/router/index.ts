import { RouteRecordRaw } from "vue-router";
import Layout from "@manager/layout/index.vue";
import Home from "@manager/views/home/index.vue";
import History from "@manager/views/history/index.vue";
import Category from "@manager/views/category/index.vue";
import Search from "@manager/views/search/index.vue";
import Setting from "@manager/views/setting/index.vue";

const route: RouteRecordRaw = {
  path: "/manager",
  component: Layout,
  children: [
    {
      path: "",
      redirect: "/manager/home",
    },
    {
      path: "home",
      component: Home,
    },
    {
      path: "category",
      component: Category,
    },
    {
      path: "history",
      component: History,
    },
    {
      path: "search",
      component: Search,
    },
    {
      path: "setting",
      component: Setting,
    },
  ],
};

export default route;
