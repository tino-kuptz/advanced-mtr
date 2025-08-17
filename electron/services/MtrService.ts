import { EventEmitter } from 'events'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import { lookup } from 'dns'
import * as dgram from 'dgram'
import * as net from 'net'
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

    // Look up multiple hops in parallel (up to 15 at a time)
    const batchSize = 15
    const maxHops = this.config.maxHops
    
    for (let startTtl = 1; startTtl <= maxHops; startTtl += batchSize) {
      if (!this.isRunning) break
      
      const endTtl = Math.min(startTtl + batchSize - 1, maxHops)
      console.log(`Traceroute batch: hops ${startTtl} to ${endTtl}`)
      
      // Create array of TTLs for this batch
      const ttlBatch = Array.from({ length: endTtl - startTtl + 1 }, (_, i) => startTtl + i)
      
             // Execute all hops in this batch in parallel, but process them as they complete
       const hopPromises = ttlBatch.map(async (ttl) => {
         try {
           const hopIp = await this.tracerouteHop(ttl)
           return { ttl, hopIp, success: true }
         } catch (error) {
           console.error(`Error in traceroute hop ${ttl}:`, error)
           return { ttl, hopIp: null, success: false }
         }
       })
       
               // Process hops as they complete, but maintain order
        let targetReached = false
        let consecutiveFailures = 0
        const completedHops = new Set<number>()
        const pendingHops = new Map<number, any>() // Store completed but not yet emitted hops
        
        while (completedHops.size < hopPromises.length && !targetReached && this.isRunning) {
          // Wait for the next hop to complete
          const result = await Promise.race(
            hopPromises.map((promise, index) => 
              promise.then(result => ({ ...result, originalIndex: index }))
            ).filter((_, index) => !completedHops.has(ttlBatch[index]))
          )
          
          completedHops.add(result.ttl)
          
          if (result.success && result.hopIp) {
            consecutiveFailures = 0 // Reset failure counter
            
            const hop = new MtrHop(result.ttl, result.hopIp)
            this.hops.set(result.ttl, hop)
            
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
            
            // Store the hop for ordered emission
            pendingHops.set(result.ttl, { hop, result })
            
            // Hostname asynchron auflösen (nicht-blockierend)
            setTimeout(async () => {
              try {
                const hostname = await this.resolveHostname(result.hopIp)
                if (hostname) {
                  console.log(`Setting hostname for ${result.hopIp}: ${hostname}`)
                  hop.setHostname(hostname)
                  // Hop mit Hostname erneut emittieren
                  const updatedHop = await hop.toApi()
                  this.emit('hop-updated', updatedHop)
                }
              } catch (error) {
                console.warn(`Could not resolve hostname for ${result.hopIp}:`, error)
              }
            }, 100) // Kleine Verzögerung für bessere Performance
            
            // Wenn wir das Ziel erreicht haben, können wir aufhören
            if (result.hopIp === this.config.target) {
              console.log(`Reached target ${this.config.target} at hop ${result.ttl}`)
              targetReached = true
              break
            }
            
            this.emit('progress', {
              currentHop: result.ttl,
              maxHops: this.config.maxHops,
              currentIp: result.hopIp,
              phase: 'mtr'
            })
          } else {
            consecutiveFailures++
            console.log(`Hop ${result.ttl} failed, consecutive failures: ${consecutiveFailures}`)
            
            this.emit('progress', {
              currentHop: result.ttl,
              maxHops: this.config.maxHops,
              currentIp: 'unknown',
              phase: 'mtr'
            })
          }
        }
        
        // Hops nur in der richtigen Reihenfolge emittieren
        for (let ttl = startTtl; ttl <= endTtl; ttl++) {
          const pendingHop = pendingHops.get(ttl)
          if (pendingHop) {
            // Emit hop in correct order
            this.emit('hop-found', await pendingHop.hop.toApi())
          }
        }
      
      // Wenn das Ziel erreicht wurde oder zu viele aufeinanderfolgende Fehler, stoppe
      if (targetReached) {
        console.log('Target reached, stopping traceroute')
        break
      }
      
      if (consecutiveFailures >= 3) {
        console.log(`Stopping traceroute due to ${consecutiveFailures} consecutive failures`)
        break
      }
      
      // Kleine Pause zwischen Batches um Netzwerküberlastung zu vermeiden
      await this.delay(200)
    }
  }

  /**
   * Führt Traceroute für einen einzelnen Hop aus
   */
  private async tracerouteHop(ttl: number): Promise<string | null> {
    if (!this.config) return null

    // Versuche native Traceroute zuerst, fallback auf Systembefehle
    try {
      const nativeResult = await this.tracerouteHopNative(ttl)
      if (nativeResult) {
        return nativeResult
      }
    } catch (error) {
      console.log(`Native traceroute failed for hop ${ttl}, falling back to system command`)
    }

    // Fallback auf Systembefehle
    const isWindows = process.platform === 'win32'
    if (isWindows) {
      try {
        const windowsResult = await this.tracerouteHopWindows(ttl)
        if (windowsResult) {
          return windowsResult
        }
      } catch (error) {
        console.log(`Windows traceroute failed for hop ${ttl}:`, error)
      }
    } else {
      try {
        const unixResult = await this.tracerouteHopUnix(ttl)
        if (unixResult) {
          return unixResult
        }
      } catch (error) {
        console.log(`Unix traceroute failed for hop ${ttl}:`, error)
      }
    }

    return null
  }

  /**
   * Windows-spezifische Traceroute-Implementierung
   */
  private async tracerouteHopWindows(ttl: number): Promise<string | null> {
    if (!this.config) return null

    try {
      // Verwende kürzere Timeouts für Windows und erhöhe sie etwas
      const timeoutMs = Math.min(this.config.timeout, 15000) // Max 15 Sekunden für Windows
      const command = `tracert -h ${ttl} -w ${timeoutMs} -d ${this.config.target}`

      console.log(`Executing Windows traceroute command: ${command}`)

      return new Promise((resolve) => {
        const tracert = spawn('tracert', ['-h', ttl.toString(), '-w', timeoutMs.toString(), '-d', this.config!.target], {
          windowsHide: true
        })

        let stdout = ''
        let stderr = ''

        tracert.stdout.on('data', (data: Buffer) => {
          stdout += data.toString()
        })

        tracert.stderr.on('data', (data: Buffer) => {
          stderr += data.toString()
        })

                 tracert.on('close', (code: number) => {
           console.log(`Windows traceroute output for hop ${ttl}:`, stdout)

          if (code !== 0 && stderr) {
            console.warn(`Windows tracert stderr for hop ${ttl}:`, stderr)
          }

          // Parse Windows tracert output
          const lines = stdout.split('\n').filter(line => line.trim() !== '')

          for (const line of lines) {
            // Windows tracert format: "  1    <1 ms    <1 ms    <1 ms  192.168.1.1"
            // Oder: "  1    1 ms    <1 ms    <1 ms  192.168.1.1"
            // Oder: "  1    1ms    1ms    1ms  192.168.1.1"
            // Verbesserte Regex für verschiedene Formate
            const hopMatch = line.match(/^\s*(\d+)\s+(?:[<]?\d+\s*ms\s*){1,3}\s+(\d+\.\d+\.\d+\.\d+)/)

            if (hopMatch) {
              const hopNumber = parseInt(hopMatch[1])

              if (hopNumber === ttl) {
                const ip = hopMatch[2]
                console.log(`Found IP for hop ${ttl}: ${ip}`)
                resolve(ip)
                return
              }
            }

            // Alternative format für Windows tracert mit verschiedenen Locales
            const hopMatchAlt = line.match(/^\s*(\d+)\s+.*?(\d+\.\d+\.\d+\.\d+)/)
            if (hopMatchAlt) {
              const hopNumber = parseInt(hopMatchAlt[1])

              if (hopNumber === ttl) {
                const ip = hopMatchAlt[2]
                console.log(`Found IP for hop ${ttl} (alt format): ${ip}`)
                resolve(ip)
                return
              }
            }
          }

          // If we didn't find the specific hop, try to find any hop in the output
          // This handles cases where tracert shows multiple hops but we're looking for a specific one
          for (const line of lines) {
            const anyHopMatch = line.match(/^\s*(\d+)\s+.*?(\d+\.\d+\.\d+\.\d+)/)
            if (anyHopMatch) {
              const hopNumber = parseInt(anyHopMatch[1])
              const ip = anyHopMatch[2]

              // If this is the hop we're looking for, return it
              if (hopNumber === ttl) {
                console.log(`Found IP for hop ${ttl} (fallback): ${ip}`)
                resolve(ip)
                return
              }

              // If we found a higher hop number, we've gone past our target
              if (hopNumber > ttl) {
                break
              }
            }
          }

          console.log(`No IP found for hop ${ttl}`)
          resolve(null)
        })

                 tracert.on('error', (error: Error) => {
           console.warn(`Windows tracert error for hop ${ttl}:`, error)
           resolve(null)
         })

        // Handle process exit
        tracert.on('exit', (code: number, signal: string) => {
          if (signal === 'SIGTERM') {
            console.warn(`Windows tracert killed for hop ${ttl}`)
          }
        })
      })
    } catch (error) {
      console.warn(`Windows traceroute hop ${ttl} failed:`, error)
      return null
    }
  }

  /**
   * Native Traceroute-Implementierung mit UDP-Sockets
   */
  private async tracerouteHopNative(ttl: number): Promise<string | null> {
    if (!this.config) return null

    try {
      console.log(`Native traceroute for hop ${ttl} to ${this.config.target}`)

      // Verwende UDP-Socket für TTL-basierte Traceroute
      return new Promise((resolve) => {
        // Erstelle UDP-Socket
        const socket = dgram.createSocket('udp4')

        const timeout = setTimeout(() => {
          console.log(`Native traceroute timeout for hop ${ttl}`)
          socket.close()
          resolve(null)
        }, Math.min(this.config!.timeout, 3000)) // Kürzerer Timeout für native Traceroute

        // Event-Handler für ICMP-Nachrichten (Time Exceeded)
        socket.on('message', (msg, rinfo) => {
          // Prüfe ob es eine ICMP Time Exceeded Nachricht ist (Type 11)
          if (msg.length >= 8 && msg[0] === 11) {
            console.log(`Native traceroute found hop ${ttl}: ${rinfo.address}`)
            clearTimeout(timeout)
            socket.close()
            resolve(rinfo.address)
          }
        })

        socket.on('error', (err) => {
          console.log(`UDP socket error for hop ${ttl}:`, err.message)
          clearTimeout(timeout)
          socket.close()
          resolve(null)
        })

        // Setze TTL und sende UDP-Paket
        socket.setTTL(ttl)

        // Sende UDP-Paket an einen hohen Port (unwahrscheinlich offen)
        const message = Buffer.from('TRACEROUTE')
        const port = 33434 + ttl // Standard traceroute Port-Bereich

        socket.send(message, port, this.config!.target, (err) => {
          if (err) {
            console.warn(`UDP send error for hop ${ttl}:`, err)
            clearTimeout(timeout)
            socket.close()
            resolve(null)
          }
        })
      })
    } catch (error) {
      console.warn(`Native traceroute hop ${ttl} failed:`, error)
      return null
    }
  }

  /**
   * Unix/Linux/macOS-spezifische Traceroute-Implementierung
   */
  private async tracerouteHopUnix(ttl: number): Promise<string | null> {
    if (!this.config) return null

    try {
      const command = `traceroute -n -w 1 -q ${this.config.probesPerHop} -m ${ttl} ${this.config.target}`

      console.log(`Executing Unix traceroute command: ${command}`)
      const { stdout } = await execAsync(command, { timeout: this.config.timeout })

      console.log(`Unix traceroute output for hop ${ttl}:`, stdout)

      // Parse Unix traceroute output
      const lines = stdout.split('\n').filter(line => line.trim() !== '')

      for (const line of lines) {
        // Unix/Linux/macOS traceroute format: " 1  192.168.1.1  1.234 ms  1.123 ms  1.345 ms"
        const hopMatch = line.match(/^\s*(\d+)\s+(.+)$/)

        if (hopMatch) {
          const hopNumber = parseInt(hopMatch[1])

          if (hopNumber === ttl) {
            const hopData = hopMatch[2]
            const ipMatch = hopData.match(/(\d+\.\d+\.\d+\.\d+)/)
            if (ipMatch && !hopData.includes('*')) {
              const ip = ipMatch[1]
              console.log(`Found IP for hop ${ttl}: ${ip}`)
              return ip
            }
          }
        }
      }

      console.log(`No IP found for hop ${ttl}`)
      return null
    } catch (error) {
      console.warn(`Unix traceroute hop ${ttl} failed:`, error)
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
      const { stdout } = await execAsync(command, { timeout: this.config.timeout + 1000 })
      const endTime = Date.now()

      // Parse ping output für response time (platform-specific)
      let match: RegExpMatchArray | null = null

      if (isWindows) {
        // Windows ping format: "Zeit=1ms" or "time=1ms"
        match = stdout.match(/Zeit=(\d+)ms|time=(\d+)ms/i)
        if (match) {
          return parseInt(match[1] || match[2])
        }

        // Alternative Windows format: "time<1ms"
        match = stdout.match(/Zeit<(\d+)ms|time<(\d+)ms/i)
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
      console.warn(`Ping failed for ${ip}:`, error)
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
