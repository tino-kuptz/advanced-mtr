import { EventEmitter } from 'events'
import type { MtrHop as MtrHopType } from '../../src/types'

export class MtrHop extends EventEmitter {
  private hopNumber: number
  private ip: string
  private hostname: string | null = null
  private isReachable: boolean = false
  private responseTimes: number[] = []
  private successfulPings: number = 0
  private failedPings: number = 0

  constructor(hopNumber: number, ip: string) {
    super()
    this.hopNumber = hopNumber
    this.ip = ip
  }

  /**
   * Fügt ein Ping-Ergebnis hinzu
   */
  addPingResult(responseTime: number | null): void {
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
}
