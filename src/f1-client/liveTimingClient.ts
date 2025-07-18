// f1Client.ts
import axios from 'axios'
import { BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import type {
  NegotiationResponse,
  F1LiveTimingData as F1Message
} from '../renderer/src/types/liveTimingTypes'
import { processMessage } from './messageHandlers'

export class LiveTimingClient {
  private socket: WebSocket | null = null
  private window: BrowserWindow
  private isConnecting: boolean = false
  private debugMode: boolean = false
  private logStream: fs.WriteStream | null = null
  private enableLogging: boolean = false

  constructor(window: BrowserWindow, debugMode: boolean = false, enableLogging: boolean = false) {
    this.window = window
    this.debugMode = debugMode
    this.enableLogging = enableLogging
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
   * Get the current connection status
   */
  public getStatus(): 'disconnected' | 'connecting' | 'connected' {
    if (this.isConnecting) return 'connecting'
    if (this.socket?.readyState === WebSocket.OPEN) return 'connected'
    return 'disconnected'
  }

  /**
   * Start the F1 live timing client
   * @returns Promise that resolves when connected
   */
  public async start(): Promise<void> {
    if (this.getStatus() !== 'disconnected') {
      console.log('Client is already connected or connecting')
      return
    }

    this.isConnecting = true
    console.log('Starting F1 client...')

    try {
      if (this.debugMode) {
        await this.connectDebugWebSocket()
      } else {
        const { token } = await this.negotiate()
        await this.connectWebSocket(token)
        await this.subscribe()
      }
    } catch (err) {
      console.error('Error starting F1 client:', err)
      this.isConnecting = false
      throw err
    }
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
   * Negotiates a connection with the F1 live timing SignalR server.
   * @returns A promise that resolves with the connection token and cookies.
   */
  private async negotiate(): Promise<{ token: string; cookie: string[] }> {
    const hub = encodeURIComponent(JSON.stringify([{ name: 'Streaming' }]))
    const url = `https://livetiming.formula1.com/signalr/negotiate?connectionData=${hub}&clientProtocol=1.5`

    const response = await axios.get<NegotiationResponse>(url)

    const token = response.data.ConnectionToken
    const cookie = response.headers['set-cookie'] || []

    return { token, cookie }
  }

  /**
   * Connects to the F1 live timing WebSocket.
   * @param token The connection token obtained from negotiation.
   * @returns A promise that resolves when connected
   */
  private async connectWebSocket(token: string): Promise<void> {
    const hub = encodeURIComponent(JSON.stringify([{ name: 'Streaming' }]))
    const encodedToken = encodeURIComponent(token)
    const url = `wss://livetiming.formula1.com/signalr/connect?clientProtocol=1.5&transport=webSockets&connectionToken=${encodedToken}&connectionData=${hub}`

    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(url)

      this.socket.onopen = () => {
        console.log('WebSocket connected to F1 live timing')
        this.isConnecting = false
        resolve()
      }

      this.socket.onerror = (event) => {
        console.error('WebSocket error:', event)
        this.isConnecting = false
        reject(new Error('Failed to connect to F1 live timing'))
      }

      this.socket.onmessage = (event) => {
        // Log raw message before parsing
        if (this.enableLogging) {
          this.logMessage(event.data)
        }

        try {
          const parsed = JSON.parse(event.data) as F1Message

          // Handle the main F1 live timing data payload ('R' field)
          if (parsed.R) {
            if (parsed.R.DriverList) processMessage('DriverList', parsed.R.DriverList, this.window)
            if (parsed.R.SessionInfo)
              processMessage('SessionInfo', parsed.R.SessionInfo, this.window)
            if (parsed.R.TrackStatus)
              processMessage('TrackStatus', parsed.R.TrackStatus, this.window)
            if (parsed.R.TimingAppData)
              processMessage('TimingAppData', parsed.R.TimingAppData, this.window)
            if (parsed.R.TimingStats)
              processMessage('TimingStats', parsed.R.TimingStats, this.window)
            if (parsed.R.TimingData) processMessage('TimingData', parsed.R.TimingData, this.window)
            if (parsed.R.LapCount) processMessage('LapCount', parsed.R.LapCount, this.window)
            if (parsed.R.Heartbeat) processMessage('Heartbeat', parsed.R.Heartbeat, this.window)
          }

          // Handle SignalR protocol messages (e.g., 'feed' messages in 'M')
          if (parsed.M && Array.isArray(parsed.M) && parsed.M.length > 0) {
            parsed.M.forEach((msg) => {
              if (msg.H === 'Streaming' && msg.M === 'feed' && msg.A.length > 1) {
                const dataType = msg.A[0] as string
                const dataPayload = msg.A[1]
                console.log(`Received data type: ${dataType}`)
                processMessage(dataType, dataPayload, this.window)
              }
            })
          }
        } catch (error) {
          console.error('Failed to parse message:', event.data, error)
        }
      }

      this.socket.onclose = (event) => {
        console.log('WebSocket closed:', event)
        this.isConnecting = false
        this.socket = null
      }
    })
  }

  /**
   * Subscribe to F1 telemetry feeds
   */
  private async subscribe(): Promise<void> {
    if (!this.socket) throw new Error('Socket not connected')

    const subscribeMessage = {
      H: 'Streaming',
      M: 'Subscribe',
      A: [
        [
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
          'TimingData'
        ]
      ],
      I: 1
    }

    this.socket.send(JSON.stringify(subscribeMessage))
    console.log('Subscribed to F1 telemetry feed')
  }

  /**
   * Connect to debug websocket at ws://localhost:5001
   */
  private async connectDebugWebSocket(): Promise<void> {
    console.log('Connecting to debug WebSocket...')
    const url = 'ws://localhost:5001'

    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(url)

      this.socket.onopen = () => {
        console.log('Debug WebSocket connected')
        this.window.webContents.send('debug-websocket-status', 'connected')
        this.isConnecting = false
        resolve()
      }

      this.socket.onerror = (event) => {
        console.error('Debug WebSocket error:', event)
        this.window.webContents.send('debug-websocket-status', 'error')
        this.isConnecting = false
        reject(new Error('Failed to connect to debug WebSocket'))
      }

      this.socket.onmessage = (event) => {
        // Log raw message before parsing
        if (this.enableLogging) {
          this.logMessage(event.data)
        }

        try {
          const parsed = JSON.parse(event.data) as F1Message

          if (parsed.R) {
            if (parsed.R.DriverList) processMessage('DriverList', parsed.R.DriverList, this.window)
            if (parsed.R.SessionInfo)
              processMessage('SessionInfo', parsed.R.SessionInfo, this.window)
          }

          if (parsed.M && Array.isArray(parsed.M) && parsed.M.length > 0) {
            parsed.M.forEach((msg) => {
              if (msg.H === 'Streaming' && msg.M === 'feed' && msg.A.length > 1) {
                const dataType = msg.A[0] as string
                const dataPayload = msg.A[1]
                processMessage(dataType, dataPayload, this.window)
              }
            })
          }
        } catch (error) {
          console.error('Failed to parse debug message:', event.data, error)
        }
      }

      this.socket.onclose = (event) => {
        console.log('Debug WebSocket closed:', event)
        this.window.webContents.send('debug-websocket-status', 'closed')
        this.isConnecting = false
        this.socket = null
      }
    })
  }
}
