<template>
  <div class="ping-table-container">
    <table class="ping-table">
      <thead>
        <tr>
          <th>
            IP
          </th>
          <th>Zeitstempel</th>
          <th>
            Ping 
            <template v-if="props.selectedInterval !== 'second'">
              min/max/avg
            </template>
          </th>
          <th v-if="props.selectedInterval !== 'second'">Drops</th>
        </tr>
      </thead>
      <tbody>
        <tr 
          v-for="group in groupedData" 
          :key="group.timestamp"
          :class="{ 'ping-failed': group.drops > 0 }"
        >
          <td>{{ group.ip }}</td>
          <td>{{ formatTimestamp(group.timestamp) }}</td>
          <td>
            <span v-if="group.avg !== null">
              <template v-if="props.selectedInterval !== 'second'">
                {{ group.avg.toFixed(1) }} ms
              </template>
              <template v-else>
                {{ group.avg.toFixed(1) }} ms
              </template>
            </span>
            <span v-else class="no-data">Keine Daten</span>
          </td>
          <td v-if="props.selectedInterval !== 'second'">
            <span :class="group.drops > 0 ? 'status-offline' : 'status-online'">
              {{ group.drops }}/{{ group.total }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import type { AggregatedData } from '../types'

interface Props {
  hopNumber: number
  hopIp: string
  selectedInterval: 'second' | 'minute' | '5min' | '15min' | '30min' | 'hour' | '2hour'
}

const props = defineProps<Props>()

// Aggregierte Daten für diesen Hop
const aggregatedData = ref<AggregatedData[]>([])
const loading = ref(false)

/**
 * Lädt die aggregierten Daten für diesen Hop
 */
const loadAggregatedData = async () => {
  try {
    loading.value = true
    const result = await window.electronAPI.getHopAggregatedData(props.hopNumber, props.selectedInterval)
    
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
 * Lädt Daten beim Mount und bei Änderungen
 */
onMounted(() => {
  loadAggregatedData()
})

watch(() => props.selectedInterval, () => {
  loadAggregatedData()
})

/**
 * Berechnet die gruppierten Daten für die Tabelle
 */
const groupedData = computed(() => {
  return aggregatedData.value.map(item => ({
    ip: props.hopIp,
    timestamp: item.timestamp,
    avg: item.averageResponseTime,
    drops: item.failedPings,
    total: item.totalPings
  })).reverse() // Neueste zuerst
})

/**
 * Formatiert einen Timestamp
 */
const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp)
  
  switch (props.selectedInterval) {
    case 'second':
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`
    case 'minute':
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    case '5min':
    case '15min':
    case '30min':
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    case 'hour':
      return `${date.getHours().toString().padStart(2, '0')}:00`
    case '2hour':
      return `${date.getHours().toString().padStart(2, '0')}:00`
    default:
      return date.toLocaleTimeString()
  }
}
</script>

<style scoped>
.ping-table-container {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  min-height: 300px;
}

.ping-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  background: white;
}

.ping-table th,
.ping-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.ping-table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #333;
  position: sticky;
  top: 0;
  z-index: 10;
}

.ping-table tr:hover {
  background-color: #f1f3f4;
}

.ping-table tr.ping-failed {
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

.no-data {
  color: #6c757d;
  font-style: italic;
}
</style>
