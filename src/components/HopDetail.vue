<template>
  <div class="hop-detail">
    <!-- Header -->
    <div class="hop-header">
      <button class="back-button" @click="$emit('back')">
        <span class="back-arrow">←</span>
        {{ $t('common.back') }}
      </button>
      <div class="hop-info">
        <h1 class="hop-ip">{{ hop.ip }}</h1>
        <h2 class="hop-hostname">{{ hop.hostname || $t('hop.detail.hostname') }}</h2>
      </div>
    </div>

    <!-- Chart/Table Section -->
    <div class="chart-section">
      <div class="view-controls">
        <h3>{{ $t('hop.detail.pingHistory') }}</h3>
        <div class="controls-container">
          <div class="interval-selector">
            <label>{{ $t('hop.detail.interval') }}:</label>
            <select v-model="selectedInterval" @change="updateInterval">
              <option value="second">{{ $t('hop.detail.second') }}</option>
              <option value="minute">{{ $t('hop.detail.minute') }}</option>
              <option value="5min">{{ $t('hop.detail.5min') }}</option>
              <option value="15min">{{ $t('hop.detail.15min') }}</option>
              <option value="30min">{{ $t('hop.detail.30min') }}</option>
              <option value="hour">{{ $t('hop.detail.hour') }}</option>
              <option value="2hour">{{ $t('hop.detail.2hour') }}</option>
            </select>
          </div>
          <div class="view-toggle">
            <button 
              class="toggle-btn" 
              :class="{ active: viewMode === 'chart' }"
              @click="viewMode = 'chart'"
            >
              {{ $t('hop.detail.chart') }}
            </button>
            <button 
              class="toggle-btn" 
              :class="{ active: viewMode === 'table' }"
              @click="viewMode = 'table'"
            >
              {{ $t('hop.detail.table') }}
            </button>
          </div>
        </div>
      </div>
      
      <div class="content-container">
        <!-- Chart View -->
        <PingChart 
          v-if="viewMode === 'chart'"
          :aggregated-data="aggregatedData"
          :selected-interval="selectedInterval"
        />
        
        <!-- Table View -->
        <PingTable 
          v-else
          :aggregated-data="aggregatedData"
          :selected-interval="selectedInterval"
          :hop-ip="hop.ip"
        />
      </div>
    </div>


  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch, onUnmounted } from 'vue'
import type { MtrHop, AggregatedData } from '../types'
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


/** Aktueller Anzeigemodus */
const viewMode = ref<'chart' | 'table'>('chart')

/** Ausgewähltes Zeitintervall */
const selectedInterval = ref<'second' | 'minute' | '5min' | '15min' | '30min' | 'hour' | '2hour'>('second')

/** Aggregierte Daten für diesen Hop */
const aggregatedData = ref<AggregatedData[]>([])
const loading = ref(false)

/**
 * Lädt die aggregierten Daten für diesen Hop
 */
const loadAggregatedData = async () => {
  try {
    loading.value = true
    const result = await window.electronAPI.getHopAggregatedData(props.hop.hopNumber, selectedInterval.value)
    
    if (result.success) {
      aggregatedData.value = result.data || []
    } else {
      console.error('Failed to load aggregated data:', result.error)
      aggregatedData.value = []
    }
  } catch (error) {
    console.error('Error loading aggregated data:', error)
    aggregatedData.value = []
  } finally {
    loading.value = false
  }
}

/**
 * Aktualisiert das Zeitintervall
 */
const updateInterval = () => {
  loadAggregatedData()
}

// Reagiere auch auf v-model Änderungen (Sicherheit neben @change)
watch(selectedInterval, () => {
  loadAggregatedData()
})

/**
 * Automatische Aktualisierung jede Sekunde
 */
let updateTimer: NodeJS.Timeout | null = null

/**
 * Lifecycle-Hook: Wird beim Mounten der Komponente ausgeführt
 */
onMounted(async () => {
  await nextTick()
  // Initiale Daten laden
  loadAggregatedData()
  
  // Automatische Aktualisierung jede Sekunde für alle Intervalle
  updateTimer = setInterval(() => {
    loadAggregatedData()
  }, 1000)
})

/**
 * Lifecycle-Hook: Wird beim Unmounten der Komponente ausgeführt
 */
onUnmounted(() => {
  if (updateTimer) {
    clearInterval(updateTimer)
  }
})
</script>

<style scoped>
.hop-detail {
  height: 100%;
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
  overflow-y: hidden !important;
  max-height: 100%;
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
  overflow-y: hidden !important;
  max-height: 100%;
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
