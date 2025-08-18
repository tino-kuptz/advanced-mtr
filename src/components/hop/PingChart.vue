<template>
    <div class="ping-chart">
        <div class="chart-container" ref="chartContainer">
            <apexchart type="line" :options="chartOptions" :series="chartSeries" height="100%" width="100%" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AggregatedData } from '../../types'

const { t } = useI18n()

const chartContainer = ref<HTMLElement>()
let resizeObserver: ResizeObserver | null = null

interface Props {
    aggregatedData: AggregatedData[]
    selectedInterval: 'second' | 'minute' | '5min' | '15min' | '30min' | 'hour' | '2hour'
}

const props = defineProps<Props>()

/**
 * Formats a label based on the selected interval
 */
const formatLabel = (timestamp: number) => {
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
        case '2hour':
            return `${date.getHours().toString().padStart(2, '0')}:00`
        default:
            return date.toLocaleTimeString()
    }
}

/**
 * Computes the chart data
 */
const chartData = computed(() => {
    const data = props.aggregatedData
    const labels = data.map(item => formatLabel(item.timestamp))
    const avgPoints = data.map((item, idx) => ({ x: labels[idx], y: item.averageResponseTime }))

    return {
        labels,
        avgPoints
    }
})

/**
 * ApexCharts series
 */
const chartSeries = computed(() => {
    const data = chartData.value
    return [
        {
            name: t('ping.chart.responseTime'),
            type: 'line',
            data: data.avgPoints
        }
    ]
})

/**
 * ApexCharts options
 */
const chartOptions = computed(() => {
    const data = chartData.value

    // Create background areas for timeouts
    const annotations = {
        xaxis: (() => {
            if (props.selectedInterval === 'second') {
                const timeoutRanges: any[] = []
                let currentRange: { start: number; end: number } | null = null

                props.aggregatedData.forEach((item, index) => {
                    const hasTimeout = item.hasAnyTimeout

                    if (hasTimeout) {
                        if (currentRange === null) {
                            currentRange = { start: index, end: index }
                        } else {
                            currentRange.end = index
                        }
                    } else {
                        if (currentRange !== null) {
                            const startIndex = Math.max(0, currentRange.start - 1)
                            const endIndex = Math.min(data.labels.length - 1, currentRange.end + 1)

                            const startLabel = data.labels[startIndex]
                            const endLabel = data.labels[endIndex]

                            if (startLabel !== undefined && endLabel !== undefined) {
                                timeoutRanges.push({
                                    x: startLabel,
                                    x2: endLabel,
                                    borderColor: '#FF0000',
                                    fillColor: '#FF0000',
                                    opacity: 0.2
                                })
                            }

                            currentRange = null
                        }
                    }
                })

                if (currentRange !== null) {
                    const startIndex = Math.max(0, currentRange.start - 1)
                    const endIndex = Math.min(data.labels.length - 1, currentRange.end + 1)

                    const startLabel = data.labels[startIndex]
                    const endLabel = data.labels[endIndex]

                    if (startLabel !== undefined && endLabel !== undefined) {
                        timeoutRanges.push({
                            x: startLabel,
                            x2: endLabel,
                            borderColor: '#FF0000',
                            fillColor: '#FF0000',
                            opacity: 0.2
                        })
                    }
                }

                return timeoutRanges
            } else {
                return props.aggregatedData.map((item, index) => {
                    if (item.hasAnyTimeout) {
                        const timeoutCount = item.failedPings
                        const totalPings = item.totalPings
                        const categoryLabel = data.labels[index]
                        if (categoryLabel === undefined) return null

                        const annotation: any = {
                            x: categoryLabel,
                            borderColor: '#FF0000',
                            fillColor: '#FF0000',
                            opacity: 0.2
                        }

                        const labelText = `${timeoutCount}/${totalPings}`
                        if (props.selectedInterval !== 'second' && labelText) {
                            annotation.label = {
                                text: labelText,
                                style: {
                                    color: '#fff',
                                    background: '#dc3545',
                                    fontSize: '10px'
                                }
                            }
                        }

                        return annotation
                    }
                    return null
                }).filter(Boolean)
            }
        })()
    }

    return {
        chart: {
            type: 'line',
            animations: { enabled: false },
            toolbar: { show: false },
            redrawOnWindowResize: true,
            redrawOnParentResize: true
        },
        xaxis: {
            type: 'category',
            tooltip: { enabled: true }
        },
        yaxis: {
            title: { text: 'Antwortzeit (ms)' },
            min: 0,
            labels: {
                formatter: function (value: any) {
                    return Math.round(Number(value)).toString()
                }
            }
        },
        annotations: annotations,
        colors: ['#28a745'],
        fill: { type: ['solid'], opacity: [1] },
        stroke: { curve: 'straight', width: 2 },
        markers: { size: 0, strokeWidth: 0 },
        tooltip: {
            shared: true,
            intersect: false,
            y: {
                formatter: function (value: any) {
                    if (value === null || value === undefined) return 'Keine Daten'
                    return `${Number(value).toFixed(1)} ms`
                }
            }
        },
        legend: {
            position: 'top',
            showForSingleSeries: true
        }
    }
})

// Handle chart resizing
onMounted(() => {
    if (chartContainer.value) {
        resizeObserver = new ResizeObserver(() => {
            // Trigger chart redraw when container size changes
            const chartElement = chartContainer.value?.querySelector('.apexcharts-canvas')
            if (chartElement) {
                // Force chart to recalculate dimensions
                window.dispatchEvent(new Event('resize'))
            }
        })
        resizeObserver.observe(chartContainer.value)
    }
})

onUnmounted(() => {
    if (resizeObserver) {
        resizeObserver.disconnect()
    }
})
</script>