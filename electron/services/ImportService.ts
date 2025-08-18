import { MtrHop } from '../models/MtrHop'
import type { MtrConfig, MtrHop as MtrHopType } from '../../src/types'

export interface ImportedMtrData {
  config: MtrConfig
  hops: MtrHopType[]
}

export class ImportService {
  /**
   * Verarbeitet importierte MTR-Daten und erstellt Hop-Objekte mit korrekten Statistiken
   */
  static processImportedData(rawData: any): ImportedMtrData {
    // Hops mit berechneten Statistiken erstellen
    const hopsWithStats = Array.from(rawData.hops.values()).map((hop: any) => {
      // Berechne Statistiken basierend auf den Ping-Daten
      const successfulPings = hop.getSuccessfulPings ? hop.getSuccessfulPings() : (hop.successfulPings || 0)
      const failedPings = hop.getFailedPings ? hop.getFailedPings() : (hop.failedPings || 0)
      const totalPings = successfulPings + failedPings
      
      // Berechne durchschnittliche Antwortzeit (falls vorhanden)
      let averageResponseTime = null
      if (hop.getAverageResponseTime) {
        averageResponseTime = hop.getAverageResponseTime()
      } else if (hop.averageResponseTime !== undefined && hop.averageResponseTime !== null) {
        averageResponseTime = hop.averageResponseTime
      }
      
      return {
        hopNumber: hop.getHopNumber ? hop.getHopNumber() : hop.hopNumber,
        ip: hop.getIp ? hop.getIp() : hop.ip,
        hostname: hop.getHostname ? hop.getHostname() : hop.hostname,
        isReachable: successfulPings > 0,
        averageResponseTime: averageResponseTime,
        successfulPings: successfulPings,
        failedPings: failedPings
      }
    })
    
    return {
      config: rawData.config,
      hops: hopsWithStats
    }
  }

  /**
   * Konvertiert importierte Daten in MtrHop-Objekte für das Backend
   */
  static createMtrHopObjects(rawData: any): Map<number, MtrHop> {
    const hops = new Map<number, MtrHop>()
    
    for (const hopData of Array.from(rawData.hops.values())) {
      const hopNumber = hopData.getHopNumber ? hopData.getHopNumber() : hopData.hopNumber
      const ip = hopData.getIp ? hopData.getIp() : hopData.ip
      const hop = new MtrHop(hopNumber, ip)
      
      const hostname = hopData.getHostname ? hopData.getHostname() : hopData.hostname
      if (hostname) {
        hop.setHostname(hostname)
      }
      
      // Ping-Historie wiederherstellen (falls vorhanden)
      if (hopData.getPingHistoryForExport) {
        const pingHistory = hopData.getPingHistoryForExport()
        if (pingHistory && Array.isArray(pingHistory)) {
          hop.setPingHistoryFromImport(pingHistory)
        }
      } else if (hopData.pingHistory && Array.isArray(hopData.pingHistory)) {
        hop.setPingHistoryFromImport(hopData.pingHistory)
      }
      
      hops.set(hopNumber, hop)
    }
    
    return hops
  }
}
