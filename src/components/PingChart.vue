<template>
    <div class="ping-chart">
        <div class="chart-container">
            <apexchart type="line" :options="chartOptions" :series="chartSeries" height="300" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

interface Props {
    pingHistory: any[]
    hopIp: string
    selectedInterval: 'second' | 'minute' | '5min' | '15min' | '30min' | 'hour' | '2hour'
}

const props = defineProps<Props>()

/**
 * Berechnet die Ping-Historie für diesen spezifischen Hop
 */
const hopPingHistory = computed(() => {
    return props.pingHistory.filter(ping => ping.targetIp === props.hopIp)
})

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
const groupPingsByInterval = (pings: any[], intervalMs: number) => {
    const groups: { [key: string]: any[] } = {}

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
 * Berechnet Durchschnitt und Status für eine Ping-Gruppe
 */
const calculateIntervalStats = (pings: any[]) => {
    const successfulPings = pings.filter(p => p.isSuccessful && p.responseTime !== null)
    const failedPings = pings.filter(p => !p.isSuccessful)

    // Mindestens ein Timeout = rot markieren
    const hasAnyTimeout = failedPings.length > 0

    if (successfulPings.length === 0) {
        return {
            averageResponseTime: null,
            hasAnyTimeout: hasAnyTimeout,
            totalPings: pings.length
        }
    }

    const totalResponseTime = successfulPings.reduce((sum, ping) => sum + ping.responseTime, 0)
    const averageResponseTime = totalResponseTime / successfulPings.length

    return {
        averageResponseTime,
        hasAnyTimeout: hasAnyTimeout,
        totalPings: pings.length
    }
}

/**
 * Berechnet die Chart-Daten
 */
const chartData = computed(() => {
    const history = hopPingHistory.value
    const intervalMs = getIntervalMs(props.selectedInterval)
    const groups = groupPingsByInterval(history, intervalMs)

    // Sortiere Gruppen nach Zeitstempel
    const sortedKeys = Object.keys(groups).sort((a, b) => parseInt(a) - parseInt(b))

    // Bei Sekundenansicht nur die letzten 30 Sekunden anzeigen
    let displayKeys = sortedKeys
    if (props.selectedInterval === 'second') {
        displayKeys = sortedKeys.slice(-30)
    }

    const labels = displayKeys.map(key => {
        const timestamp = parseInt(key)
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
    })

    const responseTimes = displayKeys.map(key => {
        const stats = calculateIntervalStats(groups[key])
        return stats.averageResponseTime
    })

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
    const history = hopPingHistory.value
    const intervalMs = getIntervalMs(props.selectedInterval)
    var groups = groupPingsByInterval(history, intervalMs)
    var sortedKeys = Object.keys(groups).sort((a, b) => parseInt(a) - parseInt(b))

    // Immer nur die letzten 30 Datensätze anzeigen
    let displayKeys = sortedKeys.slice(-30)


    const limitedGroups: Record<string, typeof groups[string]> = {}
    for (const key of displayKeys) {
        limitedGroups[key] = groups[key]
    }

    // Verwende die begrenzten Daten
    groups = limitedGroups
    sortedKeys = displayKeys

    // Erstelle Hintergrund-Bereiche für Timeouts
    const annotations = {
        xaxis: (() => {
            if (props.selectedInterval === 'second') {
                // Für Sekundenansicht: Bereiche von einem Punkt vor bis einem Punkt nach Timeouts
                const timeoutRanges: any[] = []
                let currentRange: { start: number; end: number } | null = null

                displayKeys.forEach((key, index) => {
                    const stats = calculateIntervalStats(groups[key])
                    const hasTimeout = stats.hasAnyTimeout

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
                            const endIndex = Math.min(displayKeys.length - 1, currentRange.end + 1)

                            const startKey = displayKeys[startIndex]
                            const endKey = displayKeys[endIndex]

                            const startTimestamp = parseInt(startKey)
                            const endTimestamp = parseInt(endKey)
                            const startDate = new Date(startTimestamp)
                            const endDate = new Date(endTimestamp)

                            const startLabel = `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}:${startDate.getSeconds().toString().padStart(2, '0')}`
                            const endLabel = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}:${endDate.getSeconds().toString().padStart(2, '0')}`

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
                    const endIndex = Math.min(displayKeys.length - 1, currentRange.end + 1)

                    const startKey = displayKeys[startIndex]
                    const endKey = displayKeys[endIndex]

                    const startTimestamp = parseInt(startKey)
                    const endTimestamp = parseInt(endKey)
                    const startDate = new Date(startTimestamp)
                    const endDate = new Date(endTimestamp)

                    const startLabel = `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}:${startDate.getSeconds().toString().padStart(2, '0')}`
                    const endLabel = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}:${endDate.getSeconds().toString().padStart(2, '0')}`

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
                return displayKeys.map((key, _index) => {
                    const stats = calculateIntervalStats(groups[key])
                    if (stats.hasAnyTimeout) {
                        // Zähle die Anzahl der Timeouts in diesem Intervall
                        const failedPings = groups[key].filter((p: any) => !p.isSuccessful)
                        const timeoutCount = failedPings.length
                        const totalPings = groups[key].length

                        // Zeige Timeout-Anzahl nur wenn nicht auf Sekundenbasis
                        let labelText = ''
                        if (props.selectedInterval !== 'second') {
                            labelText = `${timeoutCount}/${totalPings}`
                        }

                        // Erstelle das Label für diese Kategorie
                        const timestamp = parseInt(key)
                        const date = new Date(timestamp)
                        let categoryLabel = ''

                        switch (props.selectedInterval) {
                            case 'second':
                                categoryLabel = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`
                                break
                            case 'minute':
                                categoryLabel = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
                                break
                            case '5min':
                            case '15min':
                            case '30min':
                                categoryLabel = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
                                break
                            case 'hour':
                            case '2hour':
                                categoryLabel = `${date.getHours().toString().padStart(2, '0')}:00`
                                break
                            default:
                                categoryLabel = date.toLocaleTimeString()
                        }

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

/**
 * Aktualisiert das Chart
 */
const updateChart = () => {
    // ApexCharts aktualisiert sich automatisch
}
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
