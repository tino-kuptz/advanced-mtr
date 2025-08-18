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
            <button class="toggle-btn" :class="{ active: viewMode === 'chart' }" @click="viewMode = 'chart'">
              {{ $t('hop.detail.chart') }}
            </button>
            <button class="toggle-btn" :class="{ active: viewMode === 'table' }" @click="viewMode = 'table'">
              {{ $t('hop.detail.table') }}
            </button>
          </div>
        </div>
      </div>

      <div class="content-container">
        <!-- Chart View -->
        <PingChart v-if="viewMode === 'chart'" :aggregated-data="aggregatedData"
          :selected-interval="selectedInterval" />

        <!-- Table View -->
        <PingTable v-else :aggregated-data="aggregatedData" :selected-interval="selectedInterval" :hop-ip="hop.ip" />
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
 * Props for the HopDetail component
 */
interface Props {
  /** Hop information */
  hop: MtrHop
}

/**
 * Events emitted by the HopDetail component
 */
interface Emits {
  /** Emitted when the user wants to go back to the table */
  (e: 'back'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()


/** Current display mode */
const viewMode = ref<'chart' | 'table'>('chart')

/** Selected time interval */
const selectedInterval = ref<'second' | 'minute' | '5min' | '15min' | '30min' | 'hour' | '2hour'>('second')

/** Aggregated data for this hop */
const aggregatedData = ref<AggregatedData[]>([])
const loading = ref(false)

/**
 * Loads aggregated data for this hop
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
 * Updates the selected time interval
 */
const updateInterval = () => {
  loadAggregatedData()
}

// Also react to v-model changes (safety in addition to @change)
watch(selectedInterval, () => {
  loadAggregatedData()
})

/**
 * Automatic update every second
 */
let updateTimer: NodeJS.Timeout | null = null

/**
 * Lifecycle hook: runs when the component is mounted
 */
onMounted(async () => {
  await nextTick()
  // Load initial data
  loadAggregatedData()

  // Automatic update every second for all intervals
  updateTimer = setInterval(() => {
    loadAggregatedData()
  }, 1000)
})

/**
 * Lifecycle hook: runs when the component is unmounted
 */
onUnmounted(() => {
  if (updateTimer) {
    clearInterval(updateTimer)
  }
})
</script>