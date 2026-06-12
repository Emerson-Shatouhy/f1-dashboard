import axios from 'axios'
import WebSocket from 'ws'
import { BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import type { NegotiationResponse } from '../renderer/src/types/liveTimingTypes'
import { processMessage } from './messageHandlers'
import { F1Auth } from './f1auth'

export class LiveTimingClient {
  private socket: WebSocket | null = null
  private window: BrowserWindow
  private isConnecting: boolean = false
  private debugMode: boolean = false
  private logStream: fs.WriteStream | null = null
  private enableLogging: boolean = false
  private f1Auth: F1Auth

  constructor(window: BrowserWindow, debugMode: boolean = false, enableLogging: boolean = false) {
    this.window = window
    this.debugMode = debugMode
    this.enableLogging = enableLogging
    this.f1Auth = new F1Auth()
    if (enableLogging) {
      const logDir = path.join(process.cwd(), 'logs')
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir)
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const logPath = path.join(logDir, `f1-messages-${timestamp}.log`)
      this.logStream = fs.createWriteStream(logPath, { flags: 'a' })
      console.log(`Logging F1 messages to: ${logPath}`)
    }
  }

  /**
   * Log raw message to file if logging is enabled
   */
  private logMessage(data: string): void {
    if (this.logStream) {
      this.logStream.write(`${data}\n`)
    }
  }

  /**
   * Log to console only if logging is enabled
   */
  private log(...args: unknown[]): void {
    if (this.enableLogging) {
      console.log(...args)
    }
  }

  /**
   * Get the current connection status
   */
  public getStatus(): 'disconnected' | 'connecting' | 'connected' {
    if (this.isConnecting) return 'connecting'
    if (this.socket?.readyState === WebSocket.OPEN) return 'connected'
    return 'disconnected'
  }

  /**
   * Get current debug/logging settings
   */
  public getSettings(): { debugMode: boolean; enableLogging: boolean } {
    return { debugMode: this.debugMode, enableLogging: this.enableLogging }
  }

  /**
   * Enable or disable debug mode (requires reconnect to take effect)
   */
  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled
  }

  /**
   * Enable or disable message logging
   */
  public setLoggingMode(enabled: boolean): void {
    this.enableLogging = enabled
    if (enabled && !this.logStream) {
      const logDir = path.join(process.cwd(), 'logs')
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir)
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const logPath = path.join(logDir, `f1-messages-${timestamp}.log`)
      this.logStream = fs.createWriteStream(logPath, { flags: 'a' })
      console.log(`Logging F1 messages to: ${logPath}`)
    } else if (!enabled && this.logStream) {
      this.logStream.end()
      this.logStream = null
    }
  }

  /**
   * Emit current status to the renderer window
   */
  private broadcast(channel: string, data: unknown): void {
    BrowserWindow.getAllWindows().forEach((w) => {
      if (!w.isDestroyed()) w.webContents.send(channel, data)
    })
  }

  private emitStatus(): void {
    this.broadcast('f1-client-status', {
      status: this.getStatus(),
      ...this.getSettings()
    })
  }

  /**
   * Start the F1 live timing client
   * @param forceReauth Force re-authentication even if cached token exists
   * @returns Promise that resolves when connected
   */
  public async start(forceReauth: boolean = false): Promise<void> {
    if (this.getStatus() !== 'disconnected') {
      this.log('Client is already connected or connecting')
      return
    }

    this.isConnecting = true
    this.emitStatus()

    try {
      if (this.debugMode) {
        console.log('Starting in debug mode - connecting to debug WebSocket')
        await this.connectDebugWebSocket()
      } else {
        // Get auth token (opens browser login if needed)
        const authToken = await this.f1Auth.getAuthToken(forceReauth)
        const { token, awsalbcors } = await this.negotiate(authToken)
        await this.connectWebSocket(token, awsalbcors, authToken)
        await this.subscribe()
      }
      this.emitStatus()
    } catch (err) {
      console.error('❌ Error starting F1 client:', err)
      this.isConnecting = false
      this.emitStatus()
      throw err
    }
  }

  /**
   * Check if the user is authenticated with F1TV
   */
  public isAuthenticated(): boolean {
    return this.f1Auth.isAuthenticated()
  }

  /**
   * Clear stored F1TV authentication
   */
  public clearAuth(): void {
    this.f1Auth.clearAuth()
  }

  /**
   * Stop the F1 live timing client
   */
  public stop(): void {
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
    if (this.logStream) {
      this.logStream.end()
      this.logStream = null
    }
    this.isConnecting = false
  }

  /**
   * Negotiates a connection with the F1 SignalR Core server.
   * Mirrors the FastF1 flow:
   *  1. OPTIONS preflight to get AWSALBCORS cookie
   *  2. POST negotiate to get connectionToken
   * @param authToken F1TV subscription token
   * @returns connection token and AWSALBCORS cookie value
   */
  private async negotiate(
    authToken: string | null
  ): Promise<{ token: string; awsalbcors: string }> {
    const negotiateUrl = 'https://livetiming.formula1.com/signalrcore/negotiate'

    // Step 1: OPTIONS preflight to get AWSALBCORS cookie.
    // The server returns 405 but still sets the cookie — capture it, don't throw.
    let awsalbcors = ''
    try {
      const preflightResp = await axios.options(negotiateUrl, {
        headers: { 'User-Agent': 'BestHTTP' },
        validateStatus: () => true // accept any status
      })
      const setCookie: string[] = preflightResp.headers['set-cookie'] ?? []
      awsalbcors =
        setCookie
          .find((c: string) => c.startsWith('AWSALBCORS='))
          ?.split(';')[0]
          ?.split('=')[1] ?? ''
    } catch {
      // network error on preflight — proceed without cookie
    }

    // Step 2: POST negotiate to get connectionToken
    const headers: Record<string, string> = {
      'User-Agent': 'BestHTTP',
      ...(awsalbcors ? { Cookie: `AWSALBCORS=${awsalbcors}` } : {})
    }
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    const response = await axios.post<NegotiationResponse>(
      `${negotiateUrl}?negotiateVersion=1`,
      null,
      { headers }
    )

    const token = response.data.ConnectionToken ?? response.data.connectionToken
    if (!token) throw new Error('No connection token in negotiate response')
    return { token, awsalbcors }
  }

  /**
   * Connects to the F1 SignalR Core WebSocket.
   * Auth token is passed as access_token query param (SignalR Core convention).
   * AWSALBCORS cookie is included as a Cookie header.
   */
  private async connectWebSocket(
    token: string,
    awsalbcors: string,
    authToken: string | null
  ): Promise<void> {
    const encodedToken = encodeURIComponent(token)
    let url = `wss://livetiming.formula1.com/signalrcore?id=${encodedToken}`
    if (authToken) {
      url += `&access_token=${encodeURIComponent(authToken)}`
    }

    // Use ws package so we can pass Cookie header on the upgrade request
    const wsOptions: WebSocket.ClientOptions = awsalbcors
      ? { headers: { Cookie: `AWSALBCORS=${awsalbcors}` } }
      : {}

    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(url, wsOptions)

      let handshakeDone = false

      this.socket.onopen = () => {
        // SignalR Core requires a JSON handshake as the very first message
        this.socket!.send(JSON.stringify({ protocol: 'json', version: 1 }) + '\x1e')
      }

      this.socket.onerror = () => {
        this.isConnecting = false
        this.emitStatus()
        reject(new Error('Failed to connect to F1 live timing'))
      }

      this.socket.onmessage = (event) => {
        if (this.enableLogging) {
          this.logMessage(event.data as string)
        }

        const frames = (event.data as string).split('\x1e').filter(Boolean)

        for (const frame of frames) {
          try {
            const parsed = JSON.parse(frame)

            // Handshake response — empty object {} means success
            if (!handshakeDone) {
              if (parsed.error) {
                reject(new Error(`SignalR handshake error: ${parsed.error}`))
                return
              }
              handshakeDone = true
              this.isConnecting = false
              resolve()
              continue
            }

            this.handleSignalRFrame(parsed)
          } catch (error) {
            console.error('Failed to parse SignalR frame:', frame, error)
          }
        }
      }

      this.socket.onclose = () => {
        this.isConnecting = false
        this.socket = null
        this.emitStatus()
      }
    })
  }

  /**
   * Process a parsed SignalR Core frame and dispatch to message handlers.
   * type 1 = live feed invocation: { target:'feed', arguments:[dataType, payload] }
   * type 2/3 = initial snapshot / completion: { result: { topicName: data, ... } }
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleSignalRFrame(parsed: any): void {
    if (
      parsed.type === 1 &&
      parsed.target === 'feed' &&
      Array.isArray(parsed.arguments) &&
      parsed.arguments.length >= 2
    ) {
      processMessage(parsed.arguments[0] as string, parsed.arguments[1], this.broadcast.bind(this))
      return
    }

    if (
      (parsed.type === 2 || parsed.type === 3) &&
      parsed.result &&
      typeof parsed.result === 'object'
    ) {
      for (const [dataType, dataPayload] of Object.entries(parsed.result)) {
        if (dataPayload != null) {
          processMessage(dataType, dataPayload, this.broadcast.bind(this))
        }
      }
    }
  }

  /**
   * Subscribe to F1 telemetry feeds (SignalR Core invocation format)
   */
  private async subscribe(): Promise<void> {
    if (!this.socket) throw new Error('Socket not connected')

    const topics = [
      'Heartbeat',
      'CarData.z',
      'Position.z',
      'ExtrapolatedClock',
      'TopThree',
      'RcmSeries',
      'TimingStats',
      'TimingAppData',
      'WeatherData',
      'TrackStatus',
      'DriverList',
      'RaceControlMessages',
      'SessionInfo',
      'SessionData',
      'LapCount',
      'TimingData',
      'ContentStreams'
    ]

    // SignalR Core invocation: type 1, invocationId optional, target = method name
    const subscribeMessage = {
      type: 1,
      invocationId: '0',
      target: 'Subscribe',
      arguments: [topics]
    }

    this.socket.send(JSON.stringify(subscribeMessage) + '\x1e')
  }

  /**
   * Connect to debug websocket at ws://localhost:5001
   */
  private async connectDebugWebSocket(): Promise<void> {
    console.log('🔧 Connecting to debug WebSocket...')
    const url = 'ws://localhost:5001'

    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(url)

      this.socket.onopen = () => {
        console.log('✅ Debug WebSocket connected')
        this.window.webContents.send('debug-websocket-status', 'connected')
        this.isConnecting = false
        resolve()
      }

      this.socket.onerror = (event) => {
        console.error('❌ Debug WebSocket error:', event)
        this.window.webContents.send('debug-websocket-status', 'error')
        this.isConnecting = false
        this.emitStatus()
        reject(new Error('Failed to connect to debug WebSocket'))
      }

      this.socket.onmessage = (event) => {
        if (this.enableLogging) {
          this.logMessage(event.data)
        }

        const frames = (event.data as string).split('\x1e').filter(Boolean)

        for (const frame of frames) {
          try {
            this.handleSignalRFrame(JSON.parse(frame))
          } catch (error) {
            console.error('Failed to parse debug message:', frame, error)
          }
        }
      }

      this.socket.onclose = (event) => {
        console.log('⚠️  Debug WebSocket closed')
        this.log('Close event:', event)
        this.window.webContents.send('debug-websocket-status', 'closed')
        this.isConnecting = false
        this.socket = null
        this.emitStatus()
      }
    })
  }
}
