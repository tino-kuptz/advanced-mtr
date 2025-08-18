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
                {{ group.min !== null ? group.min.toFixed(1) : '-' }} / 
                {{ group.max !== null ? group.max.toFixed(1) : '-' }} / 
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
import { computed } from 'vue'
import type { AggregatedData } from '../types'

interface Props {
  aggregatedData: AggregatedData[]
  selectedInterval: 'second' | 'minute' | '5min' | '15min' | '30min' | 'hour' | '2hour'
  hopIp?: string
}

const props = defineProps<Props>()

/**
 * Berechnet die gruppierten Daten für die Tabelle
 */
const groupedData = computed(() => {
  return props.aggregatedData.map(item => ({
    ip: props.hopIp || '-',
    timestamp: item.timestamp,
    min: item.minResponseTime,
    max: item.maxResponseTime,
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
