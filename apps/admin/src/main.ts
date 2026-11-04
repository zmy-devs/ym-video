import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import './styles/global.css';

// 管理应用独立挂载自己的路由与业务状态。
createApp(App).use(createPinia()).use(router).mount('#app');
