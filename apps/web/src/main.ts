import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import './styles/global.css';

// 浏览器应用入口，不依赖桌面进程或预加载脚本。
createApp(App).use(createPinia()).use(router).mount('#app');
