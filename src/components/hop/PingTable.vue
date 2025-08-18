<template>
  <div class="ping-table-container">
    <table class="ping-table">
      <thead>
        <tr>
          <th>
            IP
          </th>
          <th>{{ $t('ping.table.timestamp') }}</th>
          <th>
            {{ $t('ping.table.responseTime') }}
            <template v-if="props.selectedInterval !== 'second'">
              min/max/avg
            </template>
          </th>
          <th v-if="props.selectedInterval !== 'second'">{{ $t('ping.table.status') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="group in groupedData" :key="group.timestamp" :class="{ 'ping-failed': group.drops > 0 }">
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
            <span v-else class="no-data">{{ $t('ping.table.timeout') }}</span>
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
import { useI18n } from 'vue-i18n'
import type { AggregatedData } from '../../types'

const { t } = useI18n()

interface Props {
  aggregatedData: AggregatedData[]
  selectedInterval: 'second' | 'minute' | '5min' | '15min' | '30min' | 'hour' | '2hour'
  hopIp?: string
}

const props = defineProps<Props>()

/**
 * Computes the grouped data for the table
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
 * Formats a timestamp
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