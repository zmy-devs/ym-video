import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import './styles/global.css';

// 两个平台共用应用入口，交互由各功能按需注册。
createApp(App).use(createPinia()).use(router).mount('#app');
