<template>
  <div class="hop-detail">
    <!-- Header -->
    <div class="hop-header">
      <button class="back-button" @click="$emit('back')">
        <span class="back-arrow">←</span>
        Zurück
      </button>
      <div class="hop-info">
        <h1 class="hop-ip">{{ hop.ip }}</h1>
        <h2 class="hop-hostname">{{ hop.hostname || 'Hostname nicht bekannt' }}</h2>
      </div>
    </div>

    <!-- Chart/Table Section -->
    <div class="chart-section">
      <div class="view-controls">
        <h3>Ping-Verlauf</h3>
        <div class="controls-container">
          <div class="interval-selector">
            <label>Zeitintervall:</label>
            <select v-model="selectedInterval" @change="updateInterval">
              <option value="second">Sekündlich</option>
              <option value="minute">Minütlich</option>
              <option value="5min">5 Minuten</option>
              <option value="15min">15 Minuten</option>
              <option value="30min">30 Minuten</option>
              <option value="hour">Stündlich</option>
              <option value="2hour">2 Stunden</option>
            </select>
          </div>
          <div class="view-toggle">
            <button 
              class="toggle-btn" 
              :class="{ active: viewMode === 'chart' }"
              @click="viewMode = 'chart'"
            >
              Chart
            </button>
            <button 
              class="toggle-btn" 
              :class="{ active: viewMode === 'table' }"
              @click="viewMode = 'table'"
            >
              Tabelle
            </button>
          </div>
        </div>
      </div>
      
      <div class="content-container">
        <!-- Chart View -->
        <PingChart 
          v-if="viewMode === 'chart'"
          :hop-number="hop.hopNumber"
          :hop-ip="hop.ip"
          :selected-interval="selectedInterval"
        />
        
        <!-- Table View -->
        <PingTable 
          v-else
          :hop-number="hop.hopNumber"
          :hop-ip="hop.ip"
          :selected-interval="selectedInterval"
        />
      </div>
    </div>


  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, nextTick } from 'vue'
import type { MtrHop, PingResult } from '../types'
import PingChart from './PingChart.vue'
import PingTable from './PingTable.vue'

/**
 * Props für die HopDetail-Komponente
 */
interface Props {
  /** Hop-Informationen */
  hop: MtrHop
}

/**
 * Events, die von der HopDetail-Komponente emittiert werden
 */
interface Emits {
  /** Wird emittiert, wenn der Benutzer zurück zur Tabelle möchte */
  (e: 'back'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const chartContainer = ref<HTMLElement>()

/** Aktueller Anzeigemodus */
const viewMode = ref<'chart' | 'table'>('chart')

/** Ausgewähltes Zeitintervall */
const selectedInterval = ref<'second' | 'minute' | '5min' | '15min' | '30min' | 'hour' | '2hour'>('minute')

/**
 * Aktualisiert das Zeitintervall
 */
const updateInterval = () => {
  // Das Intervall wird automatisch an die Kind-Komponenten weitergegeben
}



/**
 * Lifecycle-Hook: Wird beim Mounten der Komponente ausgeführt
 */
onMounted(async () => {
  await nextTick()
  // Hier könnte man zusätzliche Chart-Initialisierung machen
})
</script>

<style scoped>
.hop-detail {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: white;
}

.hop-header {
  display: flex;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
  background: #f8f9fa;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #4facfe;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.back-button:hover {
  background: #3a8bfe;
  transform: translateY(-1px);
}

.back-arrow {
  font-size: 18px;
  font-weight: bold;
}

.hop-info {
  margin-left: 20px;
}

.hop-ip {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #333;
}

.hop-hostname {
  margin: 5px 0 0 0;
  font-size: 16px;
  font-weight: 500;
  color: #666;
}

.chart-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto !important;
}

.view-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
}

.controls-container {
  display: flex;
  align-items: center;
  gap: 20px;
}

.interval-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.interval-selector label {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.interval-selector select {
  padding: 6px 12px;
  border: 2px solid #4facfe;
  border-radius: 6px;
  background: white;
  color: #333;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.interval-selector select:hover {
  background: #f0f8ff;
}

.interval-selector select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.view-controls h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.view-toggle {
  display: flex;
  gap: 8px;
}

.toggle-btn {
  padding: 8px 16px;
  border: 2px solid #4facfe;
  background: white;
  color: #4facfe;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.toggle-btn:hover {
  background: #f0f8ff;
}

.toggle-btn.active {
  background: #4facfe;
  color: white;
}

.content-container {
  flex: 1;
  background: #f8f9fa;
  border-radius: 8px;
  min-height: 300px;
  overflow-y: hidden !important;
}

.status-online {
  color: #28a745;
  font-weight: 600;
}

.status-offline {
  color: #dc3545;
  font-weight: 600;
}
</style>
