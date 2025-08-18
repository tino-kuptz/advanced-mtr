<template>
  <div class="scan-results">
    <!-- Hop Detail View -->
    <HopDetail 
      v-if="selectedHop"
      :hop="selectedHop"
      @back="closeDetail"
    />

    <!-- Main Results View -->
    <div class="results-wrapper" v-else>
      <div class="results-header">
        <h2>{{ $t('scan.results.title') }}</h2>
        <h3 v-if="mtrResults.hops.length !== 0">{{ $t('scan.results.target') }}: {{ mtrResults.target }}</h3>
      </div>
      
      <div v-if="mtrResults.hops.length === 0" class="no-results">
        <p>{{ $t('scan.results.initOneMessage') }}</p>
        <p>{{ $t('scan.results.initTwoMessage') }}</p>
        <p style="opacity: 0.5;">{{ $t('scan.results.initThreeMessage') }}</p>
      </div>

      <div v-else class="results-container">
        <!-- MTR Hops Table -->
        <div class="hops-section">
          <div class="table-container">
            <table class="hops-table">
              <thead>
                <tr>
                  <th>{{ $t('scan.results.hopNumber') }}</th>
                  <th>{{ $t('scan.results.ip') }}</th>
                  <th>{{ $t('scan.results.hostname') }}</th>
                  <th>{{ $t('scan.results.status') }}</th>
                  <th>{{ $t('scan.results.avgResponse') }}</th>
                  <th>{{ $t('scan.results.successfulPings') }}/{{ $t('scan.results.failedPings') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="hop in mtrResults.hops" 
                  :key="hop.hopNumber"
                  :class="{ 'unreachable': !hop.isReachable }"
                  @click="selectHop(hop)"
                  class="clickable-row"
                >
                  <td>{{ hop.hopNumber }}</td>
                  <td>{{ hop.ip }}</td>
                  <td>{{ hop.hostname || '-' }}</td>
                  <td>
                    <span :class="hop.isReachable ? 'status-online' : 'status-offline'">
                      {{ hop.isReachable ? $t('scan.results.reachable') : $t('scan.results.unreachable') }}
                    </span>
                  </td>
                  <td>
                    {{ hop.averageResponseTime ? `${hop.averageResponseTime.toFixed(1)} ms` : '-' }}
                  </td>
                  <td>
                    <span style="color: green;">{{ hop.successfulPings }}</span> / 
                    <span style="color: red;">{{ hop.failedPings }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { MtrResults, MtrHop } from '../../types'
import HopDetail from '../hop/HopDetail.vue'

/**
 * Props für die ScanResults-Komponente
 */
interface Props {
  /** MTR-Ergebnisse */
  mtrResults: MtrResults
}

const props = defineProps<Props>()

/**
 * Events, die von der ScanResults-Komponente emittiert werden
 */
interface Emits {
  /** Wird emittiert, wenn die Detail-Ansicht geöffnet wird */
  (e: 'detail-opened'): void
  /** Wird emittiert, wenn die Detail-Ansicht geschlossen wird */
  (e: 'detail-closed'): void
}

const emit = defineEmits<Emits>()

/** Ausgewählter Hop für die Detail-Ansicht */
const selectedHop = ref<MtrHop | null>(null)

/**
 * Wählt einen Hop für die Detail-Ansicht aus
 */
const selectHop = (hop: MtrHop) => {
  selectedHop.value = hop
  emit('detail-opened')
}

/**
 * Schließt die Detail-Ansicht
 */
const closeDetail = () => {
  selectedHop.value = null
  emit('detail-closed')
}
</script>