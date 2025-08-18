/**
 * Repräsentiert einen Hop in der MTR-Route
 */
export interface MtrHop {
  /** Hop-Nummer (TTL) */
  hopNumber: number
  /** IP-Address of the hop */
  ip: string
  /** Hostname of the hop (if available) */
  hostname: string | null
  /** Indicates if the hop is reachable */
  isReachable: boolean
  /** Average response time in milliseconds */
  averageResponseTime: number | null
  /** Number of successful pings */
  successfulPings: number
  /** Number of failed pings */
  failedPings: number
}

/**
 * Represents a single ping result
 */
export interface PingResult {
  /** Timestamp, when the ping was sent */
  sentTimestamp: number
  /** IP-Address of the target */
  targetIp: string
  /** Timestamp, when the packet arrived */
  responseTimestamp: number | null
  /** Response time in milliseconds (null if timeout) */
  responseTime: number | null
  /** Indicates if the ping was successful */
  isSuccessful: boolean
}

/**
 * Aggregated ping data for different time intervals
 */
export interface AggregatedData {
  /** Timestamp of the interval */
  timestamp: number
  /** Average response time in the interval */
  averageResponseTime: number | null
  /** Number of successful pings in the interval */
  successfulPings: number
  /** Number of failed pings in the interval */
  failedPings: number
  /** Total number of pings in the interval */
  totalPings: number
  /** Indicates if there were timeouts in the interval */
  hasAnyTimeout: boolean
  /** Smallest response time in the interval */
  minResponseTime: number | null
  /** Maximum response time in the interval */
  maxResponseTime: number | null
}

/**
 * Configuration for MTR and Ping
 */
export interface MtrConfig {
  /** Target IP or domain */
  target: string
  /** Maximum number of hops */
  maxHops: number
  /** Timeout in milliseconds for individual pings */
  timeout: number
  /** Number of pings per hop for route determination */
  probesPerHop: number
}

/**
 * Progress information during MTR/Ping
 */
export interface Progress {
  /** Current hop */
  currentHop: number
  /** Maximum number of hops */
  maxHops: number
  /** Currently pinged IP */
  currentIp: string
  /** Current phase: 'mtr' or 'ping'. Old, in the past I had the idea to combine my ping and traceroute tool */
  phase: 'mtr' | 'ping'
}

/**
 * MTR results with all hops
 */
export interface MtrResults {
  /** Ziel-IP oder Domain */
  target: string
  /** Found hops */
  hops: MtrHop[]
  /** Start time of the MTR */
  startTime: number
  /** End time of the MTR (null if still running) */
  endTime: number | null
}

/**
 * Imported MTR data
 */
export interface ImportedMtrData {
  /** MTR configuration */
  config: MtrConfig
  /** Found hops */
  hops: MtrHop[]
}
