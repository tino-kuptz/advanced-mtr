<template>
    <div class="ping-chart">
        <div class="chart-container">
            <apexchart type="line" :options="chartOptions" :series="chartSeries" height="300" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
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
            aggregatedData.value = result.data
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

// Automatische Aktualisierung jede Sekunde
let updateInterval: NodeJS.Timeout | null = null

onMounted(() => {
    updateInterval = setInterval(() => {
        if (props.selectedInterval === 'second') {
            loadAggregatedData()
        }
    }, 1000)
})

// Cleanup beim Unmount
import { onUnmounted } from 'vue'
onUnmounted(() => {
    if (updateInterval) {
        clearInterval(updateInterval)
    }
})

/**
 * Berechnet die Chart-Daten
 */
const chartData = computed(() => {
    const data = aggregatedData.value

    const labels = data.map(item => {
        const date = new Date(item.timestamp)

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
    })

    const responseTimes = data.map(item => item.averageResponseTime)

    return {
        labels,
        responseTimes
    }
})

/**
 * ApexCharts Series
 */
const chartSeries = computed(() => {
    const data = chartData.value
    return [
        {
            name: props.selectedInterval === 'second' ? 'ms' : 'Avg. ms',
            data: data.responseTimes
        }
    ]
})

/**
 * ApexCharts Options
 */
const chartOptions = computed(() => {
    const data = chartData.value

    // Erstelle Hintergrund-Bereiche für Timeouts
    const annotations = {
        xaxis: (() => {
            if (props.selectedInterval === 'second') {
                // Für Sekundenansicht: Bereiche von einem Punkt vor bis einem Punkt nach Timeouts
                const timeoutRanges: any[] = []
                let currentRange: { start: number; end: number } | null = null

                aggregatedData.value.forEach((item, index) => {
                    const hasTimeout = item.hasAnyTimeout

                    if (hasTimeout) {
                        if (currentRange === null) {
                            // Starte neuen Bereich
                            currentRange = { start: index, end: index }
                        } else {
                            // Erweitere bestehenden Bereich
                            currentRange.end = index
                        }
                    } else {
                        if (currentRange !== null) {
                            // Beende aktuellen Bereich und füge ihn hinzu
                            const startIndex = Math.max(0, currentRange.start - 1)
                            const endIndex = Math.min(data.labels.length - 1, currentRange.end + 1)

                            const startLabel = data.labels[startIndex]
                            const endLabel = data.labels[endIndex]

                            timeoutRanges.push({
                                x: startLabel,
                                x2: endLabel,
                                borderColor: '#FF0000',
                                fillColor: '#FF0000',
                                opacity: 0.2
                            })

                            currentRange = null
                        }
                    }
                })

                // Falls am Ende noch ein Bereich offen ist
                if (currentRange !== null) {
                    const startIndex = Math.max(0, currentRange.start - 1)
                    const endIndex = Math.min(data.labels.length - 1, currentRange.end + 1)

                    const startLabel = data.labels[startIndex]
                    const endLabel = data.labels[endIndex]

                    timeoutRanges.push({
                        x: startLabel,
                        x2: endLabel,
                        borderColor: '#FF0000',
                        fillColor: '#FF0000',
                        opacity: 0.2
                    })
                }

                return timeoutRanges
            } else {
                // Für andere Intervalle: Punkt-Annotationen mit Labels
                return aggregatedData.value.map((item, index) => {
                    if (item.hasAnyTimeout) {
                        // Zähle die Anzahl der Timeouts in diesem Intervall
                        const timeoutCount = item.failedPings
                        const totalPings = item.totalPings

                        // Zeige Timeout-Anzahl nur wenn nicht auf Sekundenbasis
                        let labelText = ''
                        if (props.selectedInterval !== 'second') {
                            labelText = `${timeoutCount}/${totalPings}`
                        }

                        const categoryLabel = data.labels[index]

                        const annotation: any = {
                            x: categoryLabel,
                            borderColor: '#FF0000',
                            fillColor: '#FF0000',
                            opacity: 0.2
                        }

                        // Füge Label nur hinzu, wenn Text vorhanden ist (nicht bei Sekundenansicht)
                        if (labelText) {
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
            animations: {
                enabled: false
            },
            toolbar: {
                show: false
            }
        },
        xaxis: {
            categories: data.labels,
            title: {
                text: 'Zeit'
            }
        },
        yaxis: {
            title: {
                text: 'Antwortzeit (ms)'
            },
            min: 0,
            max: 2000,
            labels: {
                formatter: function (value: any) {
                    return Math.round(value).toString()
                }
            }
        },
        annotations: annotations,
        colors: ['#28a745'],
        stroke: {
            curve: 'straight',
            width: 2
        },
        markers: {
            size: 4,
            colors: ['#28a745'],
            strokeColors: '#28a745',
            strokeWidth: 2
        },
        tooltip: {
            y: {
                formatter: function (value: any) {
                    if (value === null) {
                        return 'Keine Daten'
                    }
                    return `${value.toFixed(1)} ms`
                }
            }
        },
        legend: {
            position: 'top'
        }
    }
})
</script>

<style scoped>
.ping-chart {
    width: 100%;
    height: 100%;
    min-height: 300px;
    display: flex;
    flex-direction: column;
    padding: 0 20px;
}

.chart-container {
    flex: 1;
    position: relative;
    height: 300px;
    overflow: visible;
}
</style>
