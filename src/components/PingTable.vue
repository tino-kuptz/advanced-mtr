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
            <span v-if="group.min !== null">
              <template v-if="props.selectedInterval !== 'second'">
                {{ group.min.toFixed(1) }} / {{ group.max.toFixed(1) }} / {{ group.avg.toFixed(1) }} ms
              </template>
              <template v-else>
                {{ group.min.toFixed(1) }} ms
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
import type { PingResult } from '../types'

interface Props {
  pingHistory: PingResult[]
  hopIp: string
  selectedInterval: 'second' | 'minute' | '5min' | '15min' | '30min' | 'hour' | '2hour'
}

const props = defineProps<Props>()

/**
 * Berechnet die Millisekunden für das ausgewählte Intervall
 */
const getIntervalMs = (interval: string): number => {
  switch (interval) {
    case 'second': return 1000
    case 'minute': return 60 * 1000
    case '5min': return 5 * 60 * 1000
    case '15min': return 15 * 60 * 1000
    case '30min': return 30 * 60 * 1000
    case 'hour': return 60 * 60 * 1000
    case '2hour': return 2 * 60 * 60 * 1000
    default: return 60 * 1000
  }
}

/**
 * Gruppiert Pings nach Zeitintervallen
 */
const groupPingsByInterval = (pings: PingResult[], intervalMs: number) => {
  const groups: { [key: string]: PingResult[] } = {}

  pings.forEach(ping => {
    const timestamp = ping.sentTimestamp
    const intervalStart = Math.floor(timestamp / intervalMs) * intervalMs
    const key = intervalStart.toString()

    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(ping)
  })

  return groups
}

/**
 * Berechnet die gruppierten Daten für die Tabelle
 */
const groupedData = computed(() => {
  const history = props.pingHistory.filter(ping => ping.targetIp === props.hopIp)
  const intervalMs = getIntervalMs(props.selectedInterval)
  const groups = groupPingsByInterval(history, intervalMs)
  
  // Sortiere Gruppen nach Zeitstempel
  const sortedKeys = Object.keys(groups).sort((a, b) => parseInt(a) - parseInt(b))
  
  // Begrenze die Anzahl der angezeigten Gruppen
  let displayKeys = sortedKeys
  if (props.selectedInterval === 'second') {
    displayKeys = sortedKeys.slice(-30) // Letzte 30 Sekunden
  } else {
    displayKeys = sortedKeys.slice(-60) // Letzte 60 Gruppen für andere Intervalle
  }
  
  return displayKeys.map(key => {
    const pings = groups[key]
    const successfulPings = pings.filter(p => p.isSuccessful && p.responseTime !== null)
    const failedPings = pings.filter(p => !p.isSuccessful)
    
    if (successfulPings.length === 0) {
      return {
        ip: props.hopIp,
        timestamp: parseInt(key),
        min: null,
        max: null,
        avg: null,
        drops: failedPings.length,
        total: pings.length
      }
    }
    
    const responseTimes = successfulPings.map(p => p.responseTime!)
    const min = Math.min(...responseTimes)
    const max = Math.max(...responseTimes)
    const avg = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
    
    return {
      ip: props.hopIp,
      timestamp: parseInt(key),
      min,
      max,
      avg,
      drops: failedPings.length,
      total: pings.length
    }
  }).reverse() // Neueste zuerst
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
