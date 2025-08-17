import { EventEmitter } from 'events'
import { exec } from 'child_process'
import { promisify } from 'util'
import { lookup } from 'dns'
import { MtrHop } from '../models/MtrHop'
import type { MtrConfig, MtrResults, PingResult, Progress } from '../../src/types'

const execAsync = promisify(exec)

export class MtrService extends EventEmitter {
  private isRunning: boolean = false
  private config: MtrConfig | null = null
  private hops: Map<number, MtrHop> = new Map()
  private pingHistory: PingResult[] = []
  private startTime: number = 0
  private pingInterval: NodeJS.Timeout | null = null

  async startMtr(config: MtrConfig): Promise<void> {
    if (this.isRunning) {
      throw new Error('MTR already in progress')
    }

    this.isRunning = true
    this.config = config
    this.hops.clear()
    this.pingHistory = []
    this.startTime = Date.now()

    try {
      // Target-Hostname zu IP-Adresse auflösen (falls nötig)
      let targetIp = config.target
      if (!this.isValidIpAddress(config.target)) {
        const resolvedIp = await this.resolveIp(config.target)
        if (resolvedIp) {
          targetIp = resolvedIp
          // Config mit aufgelöster IP aktualisieren
          this.config = { ...config, target: targetIp }
        } else {
          throw new Error(`Could not resolve hostname: ${config.target}`)
        }
      }

      // Phase 1: MTR für Routenbestimmung
      await this.performTraceroute()
      
      // Phase 2: Kontinuierliches Pingen aller Hops
      await this.startContinuousPinging()
    } catch (error) {
      console.error('MTR error:', error)
      this.emit('mtr-error', error)
    }
  }

  async stopMtr(): Promise<void> {
    this.isRunning = false
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }

    console.log('MTR stopped by user')
    this.emit('mtr-complete')
  }

  /**
   * Gibt einen Hop anhand der Hop-Nummer zurück
   */
  getHop(hopNumber: number): MtrHop | undefined {
    return this.hops.get(hopNumber)
  }

  /**
   * Führt Traceroute aus um die Route zu bestimmen
   */
  private async performTraceroute(): Promise<void> {
    if (!this.config) return

    this.emit('progress', {
      currentHop: 0,
      maxHops: this.config.maxHops,
      currentIp: this.config.target,
      phase: 'mtr'
    })

    for (let ttl = 1; ttl <= this.config.maxHops; ttl++) {
      if (!this.isRunning) break

      try {
        const hopIp = await this.tracerouteHop(ttl)
        
        if (hopIp) {
          const hop = new MtrHop(ttl, hopIp)
          this.hops.set(ttl, hop)
          
          // Event-Listener für Hop-Updates hinzufügen
          hop.on('ping-updated', async () => {
            const updatedHop = await hop.toApi()
            this.emit('hop-updated', updatedHop)
          })
          
          hop.on('hostname-updated', async () => {
            const updatedHop = await hop.toApi()
            this.emit('hop-updated', updatedHop)
          })
          
          hop.on('reachability-updated', async () => {
            const updatedHop = await hop.toApi()
            this.emit('hop-updated', updatedHop)
          })
          
          // Hop sofort emittieren (ohne Hostname)
          this.emit('hop-found', await hop.toApi())
          
          // Hostname asynchron auflösen (nicht-blockierend)
          setTimeout(async () => {
            try {
              const hostname = await this.resolveHostname(hopIp)
              if (hostname) {
                console.log(`Setting hostname for ${hopIp}: ${hostname}`)
                hop.setHostname(hostname)
                // Hop mit Hostname erneut emittieren
                const updatedHop = await hop.toApi()
                this.emit('hop-updated', updatedHop)
              }
            } catch (error) {
              console.warn(`Could not resolve hostname for ${hopIp}:`, error)
            }
          }, 100) // Kleine Verzögerung für bessere Performance
          
          // Wenn wir das Ziel erreicht haben, können wir aufhören
          if (hopIp === this.config.target) {
            break
          }
        }

        this.emit('progress', {
          currentHop: ttl,
          maxHops: this.config.maxHops,
          currentIp: hopIp || 'unknown',
          phase: 'mtr'
        })

        // Kleine Pause zwischen Hops
        await this.delay(100)
      } catch (error) {
        console.error(`Error in traceroute hop ${ttl}:`, error)
      }
    }
  }

  /**
   * Führt Traceroute für einen einzelnen Hop aus
   */
  private async tracerouteHop(ttl: number): Promise<string | null> {
    if (!this.config) return null

    // Platform-specific traceroute command
    const isWindows = process.platform === 'win32'
    const command = isWindows 
      ? `tracert -h ${ttl} -w ${this.config.timeout} ${this.config.target}`
      : `traceroute -n -w 1 -q ${this.config.probesPerHop} -m ${ttl} ${this.config.target}`
    
    try {
      const { stdout } = await execAsync(command, { timeout: this.config.timeout })
      
      // Parse traceroute output
      const lines = stdout.split('\n').filter(line => line.trim() !== '')
      
      // Suche nach der Zeile mit dem gewünschten Hop
      for (const line of lines) {
        let hopMatch: RegExpMatchArray | null = null
        
        if (isWindows) {
          // Windows tracert format: "  1    <1 ms    <1 ms    <1 ms  192.168.1.1"
          hopMatch = line.match(/^\s*(\d+)\s+.+?\s+(\d+\.\d+\.\d+\.\d+)/)
        } else {
          // Unix/Linux/macOS traceroute format: " 1  192.168.1.1  1.234 ms  1.123 ms  1.345 ms"
          hopMatch = line.match(/^\s*(\d+)\s+(.+)$/)
        }
        
        if (hopMatch) {
          const hopNumber = parseInt(hopMatch[1])
          
          if (hopNumber === ttl) {
            if (isWindows) {
              // Windows: IP is in the second group
              return hopMatch[2]
            } else {
              // Unix: extract IP from the second group
              const hopData = hopMatch[2]
              const ipMatch = hopData.match(/(\d+\.\d+\.\d+\.\d+)/)
              if (ipMatch && !hopData.includes('*')) {
                return ipMatch[1]
              }
            }
            break
          }
        }
      }
      
      return null
    } catch (error) {
      console.warn(`Traceroute hop ${ttl} failed:`, error)
      return null
    }
  }

  /**
   * Löst Hostname für eine IP-Adresse auf (Reverse DNS Lookup)
   */
  private async resolveHostname(ip: string): Promise<string | null> {
    try {
      return new Promise((resolve) => {
        lookup(ip, { all: false }, (err, hostname) => {
          if (err || !hostname) {
            console.warn(`DNS resolution failed for ${ip}:`, err)
            resolve(null)
          } else {
            // Prüfe ob der Hostname nicht die IP selbst ist
            if (hostname !== ip) {
              console.log(`Resolved ${ip} to ${hostname}`)
              resolve(hostname)
            } else {
              resolve(null)
            }
          }
        })
      })
    } catch (error) {
      console.warn(`DNS resolution failed for ${ip}:`, error)
      
      // Fallback: Versuche mit externem DNS-Server
      try {
        const fallbackHostname = await this.resolveHostnameWithExternalDns(ip)
        if (fallbackHostname) {
          console.log(`Fallback DNS resolved ${ip} to ${fallbackHostname}`)
          return fallbackHostname
        }
      } catch (fallbackError) {
        console.warn(`Fallback DNS resolution failed for ${ip}:`, fallbackError)
      }
      
      return null
    }
  }

  /**
   * Fallback DNS-Auflösung mit externem DNS-Server
   */
  private async resolveHostnameWithExternalDns(ip: string): Promise<string | null> {
    try {
      const command = `nslookup ${ip} 8.8.8.8`
      const { stdout } = await execAsync(command, { timeout: 3000 })
      
      console.log(`nslookup output for ${ip}:`, stdout)
      
      // Parse nslookup output
      const lines = stdout.split('\n')
      for (const line of lines) {
        const match = line.match(/name\s*=\s*(.+)/i)
        if (match) {
          const hostname = match[1].trim()
          if (hostname && hostname !== ip) {
            console.log(`nslookup resolved ${ip} to ${hostname}`)
            return hostname
          }
        }
      }
      return null
    } catch (error) {
      console.warn(`nslookup failed for ${ip}:`, error)
      return null
    }
  }

  /**
   * Löst IP-Adresse für einen Hostnamen auf (Forward DNS Lookup)
   */
  private async resolveIp(hostname: string): Promise<string | null> {
    try {
      return new Promise((resolve) => {
        // Timeout nach 5 Sekunden
        const timeout = setTimeout(() => {
          resolve(null)
        }, 5000)

        lookup(hostname, { all: false }, (err, address) => {
          clearTimeout(timeout)
          if (err || !address) {
            resolve(null)
          } else {
            resolve(address)
          }
        })
      })
    } catch (error) {
      console.warn(`DNS resolution failed for ${hostname}:`, error)
      return null
    }
  }

  /**
   * Prüft ob eine Zeichenkette eine gültige IP-Adresse ist
   */
  private isValidIpAddress(ip: string): boolean {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip)
  }

  /**
   * Startet kontinuierliches Pingen aller gefundenen Hops
   */
  private async startContinuousPinging(): Promise<void> {
    if (!this.config) return

    this.emit('progress', {
      currentHop: 0,
      maxHops: this.hops.size,
      currentIp: 'Starting continuous ping...',
      phase: 'ping'
    })

    // Ping alle Hops jede Sekunde
    this.pingInterval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(this.pingInterval!)
        return
      }

      const pingPromises = Array.from(this.hops.values()).map(async (hop) => {
        const sentTimestamp = Date.now()
        const targetIp = hop.getIp()
        
        try {
          const responseTime = await this.pingHost(targetIp)
          const responseTimestamp = Date.now()
          
          const pingResult: PingResult = {
            sentTimestamp,
            targetIp,
            responseTimestamp,
            responseTime,
            isSuccessful: responseTime !== null
          }
          
          this.pingHistory.push(pingResult)
          hop.addPingResult(responseTime)
          
          this.emit('ping-result', pingResult)
        } catch (error) {
          const pingResult: PingResult = {
            sentTimestamp,
            targetIp,
            responseTimestamp: null,
            responseTime: null,
            isSuccessful: false
          }
          
          this.pingHistory.push(pingResult)
          hop.addPingResult(null)
          
          this.emit('ping-result', pingResult)
        }
      })

      await Promise.all(pingPromises)
    }, 1000) // Jede Sekunde
  }

  /**
   * Pingt einen einzelnen Host
   */
  private async pingHost(ip: string): Promise<number | null> {
    if (!this.config) return null

    // Platform-specific ping command
    const isWindows = process.platform === 'win32'
    const timeoutSeconds = Math.ceil(this.config.timeout / 1000)
    
    const command = isWindows 
      ? `ping -n 1 -w ${timeoutSeconds * 1000} ${ip}`
      : `ping -c 1 -W ${timeoutSeconds} ${ip}`
    
    try {
      const startTime = Date.now()
      const { stdout } = await execAsync(command, { timeout: this.config.timeout })
      const endTime = Date.now()
      
      // Parse ping output für response time (platform-specific)
      let match: RegExpMatchArray | null = null
      
      if (isWindows) {
        // Windows ping format: "Zeit=1ms"
        match = stdout.match(/Zeit=(\d+)ms|time=(\d+)ms/i)
        if (match) {
          return parseInt(match[1] || match[2])
        }
      } else {
        // Unix/Linux/macOS ping format: "time=1.234 ms"
        match = stdout.match(/time=(\d+\.?\d*)\s*ms/)
        if (match) {
          return parseFloat(match[1])
        }
      }
      
      // Fallback: use measured time if parsing fails
      return endTime - startTime
    } catch (error) {
      return null // Timeout oder Fehler
    }
  }

  /**
   * Gibt die aktuellen MTR-Ergebnisse zurück
   */
  async getResults(): Promise<MtrResults> {
    const hops = await Promise.all(
      Array.from(this.hops.values()).map(hop => hop.toApi())
    )

    return {
      target: this.config?.target || '',
      hops,
      pingHistory: this.pingHistory,
      startTime: this.startTime,
      endTime: this.isRunning ? null : Date.now()
    }
  }

  /**
   * Gibt den aktuellen Status zurück
   */
  getStatus(): { isRunning: boolean; hopCount: number; pingCount: number } {
    return {
      isRunning: this.isRunning,
      hopCount: this.hops.size,
      pingCount: this.pingHistory.length
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
