import { createApp } from 'vue'
import App from './App.vue'
import './style.css'
import VueApexCharts from 'vue3-apexcharts'

const app = createApp(App)
app.component('apexchart', VueApexCharts)
app.mount('#app')
