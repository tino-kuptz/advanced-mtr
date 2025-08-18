/**
 * Repräsentiert einen Hop in der MTR-Route
 */
export interface MtrHop {
  /** Hop-Nummer (TTL) */
  hopNumber: number
  /** IP-Adresse des Hops */
  ip: string
  /** Hostname des Hops (falls verfügbar) */
  hostname: string | null
  /** Gibt an, ob der Hop erreichbar ist */
  isReachable: boolean
  /** Durchschnittliche Antwortzeit in Millisekunden */
  averageResponseTime: number | null
  /** Anzahl der erfolgreichen Pings */
  successfulPings: number
  /** Anzahl der fehlgeschlagenen Pings */
  failedPings: number
}

/**
 * Repräsentiert ein einzelnes Ping-Ergebnis
 */
export interface PingResult {
  /** Timestamp, an dem der Ping gesendet wurde */
  sentTimestamp: number
  /** IP-Adresse an die der Ping ging */
  targetIp: string
  /** Timestamp, an dem das Paket ankam */
  responseTimestamp: number | null
  /** Antwortzeit in Millisekunden (null wenn Timeout) */
  responseTime: number | null
  /** Gibt an, ob der Ping erfolgreich war */
  isSuccessful: boolean
}

/**
 * Aggregierte Ping-Daten für verschiedene Zeitintervalle
 */
export interface AggregatedData {
  /** Timestamp des Intervalls */
  timestamp: number
  /** Durchschnittliche Antwortzeit im Intervall */
  averageResponseTime: number | null
  /** Anzahl erfolgreicher Pings im Intervall */
  successfulPings: number
  /** Anzahl fehlgeschlagener Pings im Intervall */
  failedPings: number
  /** Gesamtanzahl Pings im Intervall */
  totalPings: number
  /** Gibt an, ob es Timeouts im Intervall gab */
  hasAnyTimeout: boolean
}

/**
 * Konfiguration für MTR und Ping
 */
export interface MtrConfig {
  /** Ziel-IP oder Domain */
  target: string
  /** Maximale Anzahl von Hops */
  maxHops: number
  /** Timeout in Millisekunden für einzelne Pings */
  timeout: number
  /** Anzahl der Pings pro Hop für die Routenbestimmung */
  probesPerHop: number
}

/**
 * Fortschrittsinformationen während MTR/Ping
 */
export interface Progress {
  /** Aktueller Hop */
  currentHop: number
  /** Maximale Anzahl von Hops */
  maxHops: number
  /** Aktuell gepingte IP */
  currentIp: string
  /** Aktuelle Phase: 'mtr' oder 'ping' */
  phase: 'mtr' | 'ping'
}

/**
 * MTR-Ergebnisse mit allen Hops
 */
export interface MtrResults {
  /** Ziel-IP oder Domain */
  target: string
  /** Gefundene Hops */
  hops: MtrHop[]
  /** Start-Zeit des MTR */
  startTime: number
  /** End-Zeit des MTR (null wenn noch läuft) */
  endTime: number | null
}

/**
 * Importierte MTR-Daten
 */
export interface ImportedMtrData {
  /** MTR-Konfiguration */
  config: MtrConfig
  /** Gefundene Hops */
  hops: MtrHop[]
}
