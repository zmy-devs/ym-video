import { createApp } from 'vue';
import { createPinia } from 'pinia';
import Vue3TouchEvents from 'vue3-touch-events';
import App from './App.vue';
import { router } from './router';
import './styles/global.css';

// 两个平台共用入口，移动端手势插件只影响移动交互。
const app = createApp(App);
app.use(Vue3TouchEvents, {
  dragFrequency: 16,
  dragOutside: true,
  touchHoldTolerance: 300,
  zoomDistance: 8,
  zoomFrequency: 16,
});
app.use(createPinia()).use(router).mount('#app');
