<template>
  <div class="scan-config">
    <!-- Target Input -->
    <div class="scan-controls">
      <div class="form-group">
        <label for="target">Ziel (IP oder Domain)</label>
        <input 
          id="target" 
          v-model="mtrConfig.target" 
          type="text" 
          placeholder="8.8.8.8 oder google.com" 
          :disabled="isScanning"
        />
      </div>

      <!-- MTR Configuration -->
      <div class="form-group">
        <label for="maxHops">Max. Hops</label>
        <input 
          id="maxHops" 
          v-model.number="mtrConfig.maxHops" 
          type="number" 
          min="1" 
          max="64" 
          :disabled="props.isScanning"
        />
      </div>

      <div class="form-group">
        <label for="timeout">Timeout (ms)</label>
        <input 
          id="timeout" 
          v-model.number="mtrConfig.timeout" 
          type="number" 
          min="1000" 
          max="30000" 
          :disabled="props.isScanning"
        />
      </div>

      <!-- Start/Stop Button -->
      <button class="scan-button" @click="toggleMtr" :disabled="!isValidConfig">
        <span v-if="props.isScanning">
          <span class="loading"></span>
          Stoppen
        </span>
        <span v-else>
          MTR starten
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { MtrConfig } from '../types'

/**
 * Props für die ScanConfig-Komponente
 */
interface Props {
  /** Gibt an, ob aktuell ein MTR läuft */
  isScanning: boolean
}

/**
 * Events, die von der ScanConfig-Komponente emittiert werden
 */
interface Emits {
  /** Wird emittiert, wenn ein neuer MTR gestartet werden soll */
  (e: 'start-mtr', config: MtrConfig): void
  /** Wird emittiert, wenn der MTR gestoppt werden soll */
  (e: 'stop-mtr'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

/** Konfiguration für den MTR */
const mtrConfig = ref<MtrConfig>({
  target: '8.8.8.8',
  maxHops: 30,
  timeout: 5000,
  probesPerHop: 3
})

/**
 * Überprüft, ob die aktuelle Konfiguration gültig ist
 * @returns true wenn alle erforderlichen Felder ausgefüllt sind
 */
const isValidConfig = computed(() => {
  return mtrConfig.value.target.trim() !== '' &&
         mtrConfig.value.maxHops > 0 &&
         mtrConfig.value.maxHops <= 64 &&
         mtrConfig.value.timeout >= 1000 &&
         mtrConfig.value.timeout <= 30000
})

/**
 * Startet oder stoppt den MTR
 */
const toggleMtr = () => {
  if (props.isScanning) {
    emit('stop-mtr')
  } else {
    // Create a plain object copy to avoid serialization issues
    const config = {
      target: mtrConfig.value.target,
      maxHops: mtrConfig.value.maxHops,
      timeout: mtrConfig.value.timeout,
      probesPerHop: mtrConfig.value.probesPerHop
    }
    emit('start-mtr', config)
  }
}
</script>

<style scoped>
/* Styles werden von der Haupt-App geerbt */
</style>
