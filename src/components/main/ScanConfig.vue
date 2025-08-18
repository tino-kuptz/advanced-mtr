<template>
  <div class="scan-config">
    <!-- Target Input -->
    <div class="scan-controls">
      <div class="form-group">
        <label for="target">{{ $t('scan.config.target') }}</label>
        <input id="target" v-model="mtrConfig.target" type="text" :placeholder="$t('scan.config.targetPlaceholder')"
          :disabled="isScanning" />
      </div>

      <!-- MTR Configuration -->
      <div class="form-group">
        <label for="maxHops">{{ $t('scan.config.maxHops') }}</label>
        <input id="maxHops" v-model.number="mtrConfig.maxHops" type="number" min="1" max="64"
          :disabled="props.isScanning" />
      </div>

      <div class="form-group">
        <label for="timeout">{{ $t('scan.config.timeout') }}</label>
        <input id="timeout" v-model.number="mtrConfig.timeout" type="number" min="1000" max="30000"
          :disabled="props.isScanning" />
      </div>

      <!-- Start/Stop Button -->
      <button class="scan-button" @click="toggleMtr" :disabled="!isValidConfig">
        <span v-if="props.isScanning">
          <span class="loading"></span>
          {{ $t('scan.config.stopButton') }}
        </span>
        <span v-else>
          {{ $t('scan.config.startButton') }}
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { MtrConfig } from '../../types'

/**
 * Props for the ScanConfig component
 */
interface Props {
  /** Indicates whether an MTR is currently running */
  isScanning: boolean
}

/**
 * Events, that the ScanConfig component emits
 */
interface Emits {
  /** Emitted when a new MTR should be started */
  (e: 'start-mtr', config: MtrConfig): void
  /** Wird emittiert, wenn der MTR gestoppt werden soll */
  (e: 'stop-mtr'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

/** Configuration for the MTR */
const mtrConfig = ref<MtrConfig>({
  target: '8.8.8.8',
  maxHops: 30,
  timeout: 5000,
  probesPerHop: 3
})

/**
 * Checks if the current configuration is valid
 * @returns true if all required fields are filled
 */
const isValidConfig = computed(() => {
  return mtrConfig.value.target.trim() !== '' &&
    mtrConfig.value.maxHops > 0 &&
    mtrConfig.value.maxHops <= 64 &&
    mtrConfig.value.timeout >= 1000 &&
    mtrConfig.value.timeout <= 30000
})

/**
 * Starts or stops the MTR
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