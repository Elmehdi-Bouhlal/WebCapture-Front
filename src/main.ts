import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { vReveal } from './lib/reveal'

createApp(App).use(router).directive('reveal', vReveal).mount('#app')
