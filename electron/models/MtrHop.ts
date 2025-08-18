import { EventEmitter } from 'events'
import type { MtrHop as MtrHopType } from '../../src/types'

export interface PingData {
  sentTimestamp: number
  responseTimestamp: number | null
  responseTime: number | null
  isSuccessful: boolean
}

export interface AggregatedData {
  timestamp: number
  averageResponseTime: number | null
  successfulPings: number
  failedPings: number
  totalPings: number
  hasAnyTimeout: boolean
  minResponseTime: number | null
  maxResponseTime: number | null
}

export class MtrHop extends EventEmitter {
  private hopNumber: number
  private ip: string
  private hostname: string | null = null
  private isReachable: boolean = false
  private responseTimes: number[] = []
  private successfulPings: number = 0
  private failedPings: number = 0
  private pingHistory: PingData[] = []

  constructor(hopNumber: number, ip: string) {
    super()
    this.hopNumber = hopNumber
    this.ip = ip
  }

  /**
   * Adds a ping result
   */
  addPingResult(sentTimestamp: number, responseTimestamp: number | null, responseTime: number | null): void {
    const pingData: PingData = {
      sentTimestamp,
      responseTimestamp,
      responseTime,
      isSuccessful: responseTime !== null
    }

    this.pingHistory.push(pingData)

    if (responseTime !== null) {
      this.responseTimes.push(responseTime)
      this.successfulPings++
      this.isReachable = true
    } else {
      this.failedPings++
    }

    this.emit('ping-updated')
  }

  /**
   * Sets the hostname for this hop
   */
  setHostname(hostname: string): void {
    this.hostname = hostname
    this.emit('hostname-updated')
  }

  /**
   * Marks the hop as reachable
   */
  setReachable(reachable: boolean): void {
    this.isReachable = reachable
    this.emit('reachability-updated')
  }

  /**
   * Calculates the average response time
   */
  private getAverageResponseTime(): number | null {
    if (this.responseTimes.length === 0) {
      return null
    }
    return this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length
  }

  /**
   * Returns aggregated data for different time intervals
   */
  getAggregatedData(interval: string): AggregatedData[] {
    if (this.pingHistory.length === 0) {
      return []
    }

    const intervalMs = this.getIntervalMs(interval)
    const groups: { [key: string]: PingData[] } = {}

    // Group pings by time intervals
    this.pingHistory.forEach(ping => {
      const intervalStart = Math.floor(ping.sentTimestamp / intervalMs) * intervalMs
      const key = intervalStart.toString()

      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(ping)
    })

    // Sort groups by timestamp
    const sortedKeys = Object.keys(groups).sort((a, b) => parseInt(a) - parseInt(b))

    // In second view, only show the last 120 seconds
    let displayKeys = sortedKeys
    if (interval === 'second') {
      displayKeys = sortedKeys.slice(-120)
    }

    return displayKeys.map(key => {
      const pings = groups[key]
      const successfulPings = pings.filter(p => p.isSuccessful)
      const failedPings = pings.filter(p => !p.isSuccessful)
      const hasAnyTimeout = failedPings.length > 0

      let averageResponseTime: number | null = null
      let minResponseTime: number | null = null
      let maxResponseTime: number | null = null

      if (successfulPings.length > 0) {
        const successfulTimes = successfulPings.map(p => (p.responseTime || 0))
        const totalResponseTime = successfulTimes.reduce((sum, t) => sum + t, 0)
        averageResponseTime = totalResponseTime / successfulPings.length
        minResponseTime = Math.min(...successfulTimes)
        maxResponseTime = Math.max(...successfulTimes)
      }

      return {
        timestamp: parseInt(key),
        averageResponseTime,
        successfulPings: successfulPings.length,
        failedPings: failedPings.length,
        totalPings: pings.length,
        hasAnyTimeout,
        minResponseTime,
        maxResponseTime
      }
    })
  }

  /**
   * Calculates the milliseconds for the selected interval
   */
  private getIntervalMs(interval: string): number {
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
   * Converts the object to the API format
   */
  async toApi(): Promise<MtrHopType> {
    return {
      hopNumber: this.hopNumber,
      ip: this.ip,
      hostname: this.hostname,
      isReachable: this.isReachable,
      averageResponseTime: this.getAverageResponseTime(),
      successfulPings: this.successfulPings,
      failedPings: this.failedPings
    }
  }

  /**
   * Returns the ping history for export/import
   */
  getPingHistoryForExport(): { s: number; e: number | null }[] {
    return this.pingHistory.map(ping => ({
      s: ping.sentTimestamp,
      e: ping.responseTime == null || ping.responseTimestamp == null ? null : ping.responseTimestamp
    }))
  }

  /**
   * Sets ping history from imported data
   */
  setPingHistoryFromImport(importedHistory: { s: number; e: number | null }[]): void {
    this.pingHistory = []
    this.responseTimes = []
    this.successfulPings = 0
    this.failedPings = 0

    importedHistory.forEach(item => {
      const pingData: PingData = {
        sentTimestamp: item.s,
        responseTimestamp: item.e,
        responseTime: item.e ? item.e - item.s : null,
        isSuccessful: item.e !== null
      }

      this.pingHistory.push(pingData)

      if (pingData.responseTime !== null) {
        this.responseTimes.push(pingData.responseTime)
        this.successfulPings++
        this.isReachable = true
      } else {
        this.failedPings++
      }
    })
  }

  /**
   * Cleanup method for app shutdown
   */
  cleanup(): void {
    // Remove all event listeners
    this.removeAllListeners()
    
    // Clear arrays to free memory
    this.pingHistory = []
    this.responseTimes = []
  }

  // Getter methods
  getHopNumber(): number {
    return this.hopNumber
  }

  getIp(): string {
    return this.ip
  }

  getHostname(): string | null {
    return this.hostname
  }

  isHopReachable(): boolean {
    return this.isReachable
  }

  getSuccessfulPings(): number {
    return this.successfulPings
  }

  getFailedPings(): number {
    return this.failedPings
  }

  getPingHistory(): PingData[] {
    return this.pingHistory
  }
}
