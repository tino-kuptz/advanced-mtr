<template>
  <div id="app">
    <div class="container">
      <!-- MTR Configuration -->
      <ScanConfig 
        v-if="!isDetailView"
        :is-scanning="isRunning" 
        @start-mtr="startMtr"
        @stop-mtr="stopMtr"
      />

      <!-- MTR Results -->
      <ScanResults 
        :mtr-results="mtrResults"
        @detail-opened="isDetailView = true"
        @detail-closed="isDetailView = false"
      />

      <!-- Footer -->
      <AppFooter 
        :progress="progress"
        :status-message="statusMessage"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import ScanConfig from './components/ScanConfig.vue'
import ScanResults from './components/ScanResults.vue'
import AppFooter from './components/AppFooter.vue'
import type { MtrConfig, MtrResults, Progress } from './types'

/** Gibt an, ob aktuell ein MTR läuft */
const isRunning = ref(false)

/** Gibt an, ob die Detail-Ansicht aktiv ist */
const isDetailView = ref(false)

/** MTR-Ergebnisse */
const mtrResults = ref<MtrResults>({
  target: '',
  hops: [],
  startTime: 0,
  endTime: null
})

/** Fortschrittsinformationen des aktuellen MTR */
const progress = ref<Progress>({ currentHop: 0, maxHops: 0, currentIp: '', phase: 'mtr' })

/** Aktuelle Status-Nachricht */
const statusMessage = ref('')

/**
 * Startet einen neuen MTR mit der übergebenen Konfiguration
 * @param config - MTR-Konfiguration
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
    statusMessage.value = 'MTR wird gestartet...'

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
 * Stoppt den aktuellen MTR
 */
const stopMtr = async () => {
  try {
    await window.electronAPI.stopMtr()
    isRunning.value = false
    mtrResults.value.endTime = Date.now()
    statusMessage.value = 'MTR gestoppt'
  } catch (error) {
    console.error('Stop MTR error:', error)
  }
}

/**
 * Event-Handler für importierte MTR-Daten
 */
const handleMtrDataImported = (data: any) => {
  // Daten sind bereits verarbeitet und kommen fertig vom Backend
  mtrResults.value = {
    target: data.config.target,
    hops: data.hops,
    startTime: Date.now(),
    endTime: null
  }
  statusMessage.value = 'MTR-Daten erfolgreich importiert'
}

/**
 * Event-Handler für gefundene Hops
 * @param hop - Informationen über den gefundenen Hop
 */
const handleHopFound = (hop: any) => {
  const existingIndex = mtrResults.value.hops.findIndex(h => h.hopNumber === hop.hopNumber)
  if (existingIndex >= 0) {
    // Vue reaktivität erzwingen durch Array-Mutation
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
    // Vue reaktivität erzwingen durch Array-Mutation
    mtrResults.value.hops.splice(existingIndex, 1, hop)
  }
}

/**
 * Event-Handler für Ping-Ergebnisse
 * @param pingResult - Ping-Ergebnis
 */
const handlePingResult = (pingResult: any) => {
  // Ping-Ergebnisse werden jetzt direkt in den Hops gespeichert
  // Keine separate pingHistory mehr nötig
}

/**
 * Event-Handler für MTR-Fortschritt
 * @param progressData - Aktuelle Fortschrittsinformationen
 */
const handleMtrProgress = (progressData: Progress) => {
  progress.value = progressData
  if (progressData.phase === 'mtr') {
    statusMessage.value = `MTR: Hop ${progressData.currentHop}/${progressData.maxHops} - ${progressData.currentIp}`
  } else {
    statusMessage.value = `Ping: ${progressData.currentIp}`
  }
}

/**
 * Event-Handler für MTR-Abschluss
 */
const handleMtrComplete = () => {
  isRunning.value = false
  mtrResults.value.endTime = Date.now()
  statusMessage.value = 'MTR abgeschlossen'
}

/**
 * Lifecycle-Hook: Wird beim Mounten der Komponente ausgeführt
 * Registriert Event-Listener für Electron IPC
 */
onMounted(() => {
  // Event listeners für Electron IPC
  window.electronAPI.onHopFound(handleHopFound)
  window.electronAPI.onHopUpdated(handleHopUpdated)
  window.electronAPI.onPingResult(handlePingResult)
  window.electronAPI.onMtrProgress(handleMtrProgress)
  window.electronAPI.onMtrComplete(handleMtrComplete)
  window.electronAPI.onMtrDataImported(handleMtrDataImported)
})

/**
 * Lifecycle-Hook: Wird beim Unmounten der Komponente ausgeführt
 * Stoppt laufende MTRs und führt Cleanup durch
 */
onUnmounted(() => {
  // Cleanup bei Komponenten-Zerstörung
  if (isRunning.value) {
    stopMtr()
  }
})
</script>

<style>
/* Global styles bleiben in der Haupt-App */
</style>

