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
import type { MtrHop, AggregatedData } from '../../types'
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