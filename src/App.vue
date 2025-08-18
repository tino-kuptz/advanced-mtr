<template>
  <div id="main-wrapper">
    <div class="container">
      <!-- MTR Configuration -->
      <ScanConfig v-if="!isDetailView" :is-scanning="isRunning" @start-mtr="startMtr" @stop-mtr="stopMtr" />

      <!-- MTR Results -->
      <ScanResults :mtr-results="mtrResults" @detail-opened="isDetailView = true"
        @detail-closed="isDetailView = false" />

      <!-- Footer -->
      <AppFooter :progress="progress" :status-message="statusMessage" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import ScanConfig from './components/main/ScanConfig.vue'
import ScanResults from './components/main/ScanResults.vue'
import AppFooter from './components/layout/AppFooter.vue'
import type { MtrConfig, MtrResults, Progress } from './types'

const { t } = useI18n()

/** Indicates whether an MTR is currently running */
const isRunning = ref(false)

/** Indicates if the detail view is active */
const isDetailView = ref(false)

/** MTR results */
const mtrResults = ref<MtrResults>({
  target: '',
  hops: [],
  startTime: 0,
  endTime: null
})

/** Progress information for the current MTR */
const progress = ref<Progress>({ currentHop: 0, maxHops: 0, currentIp: '', phase: 'mtr' })

/** Current status message */
const statusMessage = ref('')

/**
 * Starts a new MTR with the given configuration
 * @param config - MTR configuration
 */
const startMtr = async (config: MtrConfig) => {
  try {
    isRunning.value = true
    mtrResults.value = {
      target: config.target,
      hops: [],
      startTime: Date.now(),
      endTime: null
    }
    progress.value = { currentHop: 0, maxHops: config.maxHops, currentIp: config.target, phase: 'mtr' }
    statusMessage.value = t('status.scanning')

    const result = await window.electronAPI.startMtr(config)

    if (!result.success) {
      throw new Error(result.error || 'Unbekannter Fehler beim MTR')
    }
  } catch (error) {
    console.error('MTR error:', error)
    statusMessage.value = `Fehler: ${(error as Error).message}`
    isRunning.value = false
  }
}

/**
 * Stops the current MTR
 */
const stopMtr = async () => {
  try {
    await window.electronAPI.stopMtr()
    isRunning.value = false
    mtrResults.value.endTime = Date.now()
    statusMessage.value = t('status.stopped')
  } catch (error) {
    console.error('Stop MTR error:', error)
  }
}

/**
 * Event-Handler for imported MTR data
 */
const handleMtrDataImported = (data: any) => {
  // Data is already processed and comes fully from the backend
  mtrResults.value = {
    target: data.config.target,
    hops: data.hops,
    startTime: Date.now(),
    endTime: null
  }
  statusMessage.value = t('status.dataImported')
}

/**
 * Event-Handler for found hops
 * @param hop - Information about the found hop
 */
const handleHopFound = (hop: any) => {
  const existingIndex = mtrResults.value.hops.findIndex(h => h.hopNumber === hop.hopNumber)
  if (existingIndex >= 0) {
    // Force Vue reactivity through array mutation
    mtrResults.value.hops.splice(existingIndex, 1, hop)
  } else {
    mtrResults.value.hops.push(hop)
  }
}

/**
 * Event-Handler für Hop-Updates
 * @param hop - Aktualisierte Hop-Informationen
 */
const handleHopUpdated = (hop: any) => {
  const existingIndex = mtrResults.value.hops.findIndex(h => h.hopNumber === hop.hopNumber)
  if (existingIndex >= 0) {
    // Force Vue reactivity through array mutation
    mtrResults.value.hops.splice(existingIndex, 1, hop)
  }
}

/**
 * Event-Handler for ping results
 * @param pingResult - Ping result
 */
const handlePingResult = (pingResult: any) => {
  // Ping results are now stored directly in the hops
  // No separate pingHistory needed anymore
}

/**
 * Event-Handler for MTR progress
 * @param progressData - Current progress information
 */
const handleMtrProgress = (progressData: Progress) => {
  progress.value = progressData
  if (progressData.phase === 'mtr') {
    statusMessage.value = t('status.mtrProgress', { current: progressData.currentHop, max: progressData.maxHops, ip: progressData.currentIp })
  } else {
    statusMessage.value = t('status.pingProgress', { ip: progressData.currentIp })
  }
}

/**
 * Event-Handler for MTR completion
 */
const handleMtrComplete = () => {
  isRunning.value = false
  mtrResults.value.endTime = Date.now()
  statusMessage.value = t('status.completed')
}

/**
 * Lifecycle-Hook: Executed when the component is mounted
 * Registers event listeners for Electron IPC
 */
onMounted(() => {
  // Event listeners for Electron IPC
  window.electronAPI.onHopFound(handleHopFound)
  window.electronAPI.onHopUpdated(handleHopUpdated)
  window.electronAPI.onPingResult(handlePingResult)
  window.electronAPI.onMtrProgress(handleMtrProgress)
  window.electronAPI.onMtrComplete(handleMtrComplete)
  window.electronAPI.onMtrDataImported(handleMtrDataImported)
})

/**
 * Lifecycle-Hook: Executed when the component is unmounted
 * Stops running MTRs and performs cleanup
 */
onUnmounted(() => {
  // Cleanup on component destruction
  if (isRunning.value) {
    stopMtr()
  }
})
</script>