import { writeFileSync, readFileSync } from 'fs'
import { MtrConfig } from '../../src/types'
import { MtrHop } from '../models/MtrHop'

export interface MtrExportData {
  version: string
  config: MtrConfig
  hops: Array<{
    hopNumber: number
    ip: string
    hostname: string | null
    pingHistory: { s: number; e: number | null }[]
  }>
  exportDate: string
}

export class ExportService {
  /**
   * Exportiert MTR-Daten in eine JSON-Datei
   */
  static exportToFile(
    filePath: string,
    config: MtrConfig,
    hops: Map<number, MtrHop>
  ): void {
    const exportData: MtrExportData = {
      version: '2.0.0',
      config: config,
      hops: Array.from(hops.values()).map(hop => ({
        hopNumber: hop.getHopNumber(),
        ip: hop.getIp(),
        hostname: hop.getHostname(),
        pingHistory: hop.getPingHistoryForExport()
      })),
      exportDate: new Date().toISOString()
    }
    
    const jsonData = JSON.stringify(exportData)
    writeFileSync(filePath, jsonData, 'utf8')
  }
  
  /**
   * Importiert MTR-Daten aus einer JSON-Datei
   */
  static importFromFile(filePath: string): {
    config: MtrConfig
    hops: Map<number, MtrHop>
  } {
    const fileContent = readFileSync(filePath, 'utf8')
    const exportData: MtrExportData = JSON.parse(fileContent)
    
    // Validiere Version
    if (!['1.0.0', '2.0.0'].includes(exportData.version)) {
      throw new Error(`Unsupported file version: ${exportData.version}`)
    }
    
    // Hops wiederherstellen
    const hops = new Map<number, MtrHop>()
    for (const hopData of exportData.hops) {
      const hop = new MtrHop(hopData.hopNumber, hopData.ip)
      if (hopData.hostname) {
        hop.setHostname(hopData.hostname)
      }
      
      // Ping-Historie wiederherstellen (nur für Version 2.0.0)
      if (exportData.version === '2.0.0' && hopData.pingHistory) {
        hop.setPingHistoryFromImport(hopData.pingHistory)
      }
      
      hops.set(hopData.hopNumber, hop)
    }
    
    return {
      config: exportData.config,
      hops: hops
    }
  }
  
  /**
   * Validiert eine MTR-Datei
   */
  static validateFile(filePath: string): boolean {
    try {
      const fileContent = readFileSync(filePath, 'utf8')
      const exportData: MtrExportData = JSON.parse(fileContent)
      
      // Prüfe ob alle erforderlichen Felder vorhanden sind
      const hasRequiredFields = 
        typeof exportData.version === 'string' &&
        exportData.config &&
        exportData.hops &&
        typeof exportData.exportDate === 'string'
      
      return hasRequiredFields
      
    } catch (error) {
      console.error('File validation error:', error)
      return false
    }
  }
}
