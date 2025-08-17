import type { MtrConfig, MtrHop, PingResult, Progress } from './index'

declare global {
  interface Window {
    electronAPI: {
      startMtr: (config: MtrConfig) => Promise<{ success: boolean; error?: string }>
      stopMtr: () => Promise<{ success: boolean }>
      onHopFound: (callback: (hop: MtrHop) => void) => void
      onHopUpdated: (callback: (hop: MtrHop) => void) => void
      onPingResult: (callback: (pingResult: PingResult) => void) => void
      onMtrProgress: (callback: (progress: Progress) => void) => void
      onMtrComplete: (callback: () => void) => void
    }
  }
}

export {}
