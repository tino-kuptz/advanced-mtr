import { writeFileSync, readFileSync } from 'fs'
import { MtrConfig, PingResult } from '../../src/types'
import { MtrHop } from '../models/MtrHop'

export interface MtrExportData {
  version: string
  config: MtrConfig
  hops: Array<{
    hopNumber: number
    ip: string
    hostname: string | null
  }>
  pingHistory: PingResult[]
  exportDate: string
}

export class ExportService {
  /**
   * Exportiert MTR-Daten in eine JSON-Datei
   */
  static exportToFile(
    filePath: string,
    config: MtrConfig,
    hops: Map<number, MtrHop>,
    pingHistory: PingResult[]
  ): void {
    const exportData: MtrExportData = {
      version: '1.0.0',
      config: config,
      hops: Array.from(hops.values()).map(hop => ({
        hopNumber: hop.getHopNumber(),
        ip: hop.getIp(),
        hostname: hop.getHostname()
      })),
      pingHistory: pingHistory,
      exportDate: new Date().toISOString()
    }
    
    const jsonData = JSON.stringify(exportData, null, 2)
    writeFileSync(filePath, jsonData, 'utf8')
  }
  
  /**
   * Importiert MTR-Daten aus einer JSON-Datei
   */
  static importFromFile(filePath: string): {
    config: MtrConfig
    hops: Map<number, MtrHop>
    pingHistory: PingResult[]
  } {
    const fileContent = readFileSync(filePath, 'utf8')
    const exportData: MtrExportData = JSON.parse(fileContent)
    
    // Validiere Version
    if (exportData.version !== '1.0.0') {
      throw new Error(`Unsupported file version: ${exportData.version}`)
    }
    
    // Hops wiederherstellen
    const hops = new Map<number, MtrHop>()
    for (const hopData of exportData.hops) {
      const hop = new MtrHop(hopData.hopNumber, hopData.ip)
      if (hopData.hostname) {
        hop.setHostname(hopData.hostname)
      }
      hops.set(hopData.hopNumber, hop)
    }
    
    return {
      config: exportData.config,
      hops: hops,
      pingHistory: exportData.pingHistory
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
        exportData.pingHistory &&
        typeof exportData.exportDate === 'string'
      
      return hasRequiredFields
      
    } catch (error) {
      console.error('File validation error:', error)
      return false
    }
  }
}
