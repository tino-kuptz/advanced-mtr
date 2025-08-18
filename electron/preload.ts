import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  startMtr: (config: any) => ipcRenderer.invoke('start-mtr', config),
  stopMtr: () => ipcRenderer.invoke('stop-mtr'),
  getHopAggregatedData: (hopNumber: number, interval: string) => 
    ipcRenderer.invoke('get-hop-aggregated-data', hopNumber, interval),
  getHopPingHistory: (hopNumber: number) => 
    ipcRenderer.invoke('get-hop-ping-history', hopNumber),
  onHopFound: (callback: (hop: any) => void) => {
    ipcRenderer.on('hop-found', (event, hop) => callback(hop))
  },
  onHopUpdated: (callback: (hop: any) => void) => {
    ipcRenderer.on('hop-updated', (event, hop) => callback(hop))
  },
  onPingResult: (callback: (pingResult: any) => void) => {
    ipcRenderer.on('ping-result', (event, pingResult) => callback(pingResult))
  },
  onMtrProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('mtr-progress', (event, progress) => callback(progress))
  },
  onMtrComplete: (callback: () => void) => {
    ipcRenderer.on('mtr-complete', () => callback())
  },
  onMtrDataImported: (callback: (data: any) => void) => {
    ipcRenderer.on('mtr-data-imported', (event, data) => callback(data))
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  }
})

// TypeScript-Deklarationen für die globale API
declare global {
  interface Window {
    electronAPI: {
      startMtr: (config: any) => Promise<any>
      stopMtr: () => Promise<any>
      getHopAggregatedData: (hopNumber: number, interval: string) => Promise<any>
      getHopPingHistory: (hopNumber: number) => Promise<any>
      onHopFound: (callback: (hop: any) => void) => void
      onHopUpdated: (callback: (hop: any) => void) => void
      onPingResult: (callback: (pingResult: any) => void) => void
      onMtrProgress: (callback: (progress: any) => void) => void
      onMtrComplete: (callback: () => void) => void
      onMtrDataImported: (callback: (data: any) => void) => void
      removeAllListeners: (channel: string) => void
    }
  }
}
