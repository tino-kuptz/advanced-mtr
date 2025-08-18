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
   * Fügt ein Ping-Ergebnis hinzu
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
   * Setzt den Hostname für diesen Hop
   */
  setHostname(hostname: string): void {
    this.hostname = hostname
    this.emit('hostname-updated')
  }

  /**
   * Markiert den Hop als erreichbar
   */
  setReachable(reachable: boolean): void {
    this.isReachable = reachable
    this.emit('reachability-updated')
  }

  /**
   * Berechnet die durchschnittliche Antwortzeit
   */
  private getAverageResponseTime(): number | null {
    if (this.responseTimes.length === 0) {
      return null
    }
    return this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length
  }

  /**
   * Gibt aggregierte Daten für verschiedene Zeitintervalle zurück
   */
  getAggregatedData(interval: string): AggregatedData[] {
    if (this.pingHistory.length === 0) {
      return []
    }

    const intervalMs = this.getIntervalMs(interval)
    const groups: { [key: string]: PingData[] } = {}

    // Gruppiere Pings nach Zeitintervallen
    this.pingHistory.forEach(ping => {
      const intervalStart = Math.floor(ping.sentTimestamp / intervalMs) * intervalMs
      const key = intervalStart.toString()

      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(ping)
    })

    // Sortiere Gruppen nach Zeitstempel
    const sortedKeys = Object.keys(groups).sort((a, b) => parseInt(a) - parseInt(b))

    // Bei Sekundenansicht nur die letzten 120 Sekunden anzeigen
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
      if (successfulPings.length > 0) {
        const totalResponseTime = successfulPings.reduce((sum, ping) => sum + (ping.responseTime || 0), 0)
        averageResponseTime = totalResponseTime / successfulPings.length
      }

      return {
        timestamp: parseInt(key),
        averageResponseTime,
        successfulPings: successfulPings.length,
        failedPings: failedPings.length,
        totalPings: pings.length,
        hasAnyTimeout
      }
    })
  }

  /**
   * Berechnet die Millisekunden für das ausgewählte Intervall
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
   * Konvertiert das Objekt in das API-Format
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
   * Gibt die Ping-Historie für Export/Import zurück
   */
  getPingHistoryForExport(): { s: number; e: number | null }[] {
    return this.pingHistory.map(ping => ({
      s: ping.sentTimestamp,
      e: ping.responseTimestamp
    }))
  }

  /**
   * Setzt die Ping-Historie aus Import-Daten
   */
  setPingHistoryFromImport(pingData: { s: number; e: number | null }[]): void {
    this.pingHistory = []
    this.responseTimes = []
    this.successfulPings = 0
    this.failedPings = 0

    pingData.forEach(data => {
      const responseTime = data.e ? data.e - data.s : null
      const isSuccessful = data.e !== null
      
      const pingData: PingData = {
        sentTimestamp: data.s,
        responseTimestamp: data.e,
        responseTime,
        isSuccessful
      }
      
      this.pingHistory.push(pingData)
      
      if (isSuccessful && responseTime !== null) {
        this.responseTimes.push(responseTime)
        this.successfulPings++
        this.isReachable = true
      } else {
        this.failedPings++
      }
    })
  }

  // Getter-Methoden
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
