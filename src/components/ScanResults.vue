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
      <h2>{{ $t('scan.results.title') }}</h2>
      
      <div v-if="mtrResults.hops.length === 0" class="no-results">
        <p>{{ $t('scan.results.initOneMessage') }}</p>
        <p>{{ $t('scan.results.initTwoMessage') }}</p>
        <p style="opacity: 0.5;">{{ $t('scan.results.initThreeMessage') }}</p>
      </div>

      <div v-else class="results-container">
        <!-- MTR Hops Table -->
        <div class="hops-section">
          <h3>{{ $t('scan.results.target') }}: {{ mtrResults.target }}</h3>
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
import type { MtrResults, MtrHop } from '../types'
import HopDetail from './HopDetail.vue'

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

<style scoped>
.no-results {
  text-align: center;
  color: #666;
  padding: 40px;
}

.hops-section {
  border-radius: 8px;
}

.table-container {
  overflow-x: auto;
  margin-top: 10px;
}

.hops-table,
.ping-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.hops-table th,
.hops-table td,
.ping-table th,
.ping-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.hops-table th,
.ping-table th {
  background-color: #e9ecef;
  font-weight: 600;
}

.hops-table tr:hover,
.ping-table tr:hover {
  background-color: #f1f3f4;
}

.clickable-row {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.clickable-row:hover {
  background-color: #e3f2fd !important;
}

.unreachable {
  opacity: 0.6;
}

.ping-failed {
  background-color: #fff5f5;
}

.status-online {
  color: #28a745;
  font-weight: 600;
}

.status-offline {
  color: #dc3545;
  font-weight: 600;
}

h2 {
  padding-left: 20px;
  flex: 0;
}

.results-wrapper {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}

.results-wrapper h2 {
  flex: 0;
}

.results-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.hops-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.hops-section h3 {
  flex: 0;
  padding: 10px 20px;
  margin: 0;
}

.table-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
}

/* Sticky table header inside scrollable container */
.table-container .hops-table thead th,
.table-container .ping-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
}

/* Ensure header background covers content behind when sticky */
.table-container .hops-table thead th,
.table-container .ping-table thead th {
  background-color: #e9ecef;
}
</style>
