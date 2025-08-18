import { createApp } from 'vue'
import App from './App.vue'
import './style.css'
import VueApexCharts from 'vue3-apexcharts'
import i18n from './i18n'

const app = createApp(App)
app.component('apexchart', VueApexCharts)
app.use(i18n)
app.mount('#app')
