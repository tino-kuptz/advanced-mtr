import type { MtrConfig, MtrHop, PingResult, Progress, AggregatedData } from './index'

declare global {
  interface Window {
    electronAPI: {
      startMtr: (config: MtrConfig) => Promise<{ success: boolean; error?: string }>
      stopMtr: () => Promise<{ success: boolean }>
      getHopAggregatedData: (hopNumber: number, interval: string) => Promise<{ success: boolean; data?: AggregatedData[]; error?: string }>
      getHopPingHistory: (hopNumber: number) => Promise<{ success: boolean; data?: PingResult[]; error?: string }>
      onHopFound: (callback: (hop: MtrHop) => void) => void
      onHopUpdated: (callback: (hop: MtrHop) => void) => void
      onPingResult: (callback: (pingResult: PingResult) => void) => void
      onMtrProgress: (callback: (progress: Progress) => void) => void
      onMtrComplete: (callback: () => void) => void
      onMtrDataImported: (callback: (data: any) => void) => void
      removeAllListeners: (channel: string) => void
    }
  }
}

export {}
