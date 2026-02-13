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
   * Start the F1 live timing client
<<<<<<< Updated upstream
   * @returns Promise that resolves when connected
   */
  public async start(): Promise<void> {
=======
   * @param forceReauth Force re-authentication even if cached token exists
   * @returns Promise that resolves when connected
   */
  public async start(forceReauth: boolean = false): Promise<void> {
>>>>>>> Stashed changes
    if (this.getStatus() !== 'disconnected') {
      this.log('Client is already connected or connecting')
      return
    }

    this.isConnecting = true
    console.log('🏎️  Starting F1 live timing client...')

    try {
<<<<<<< Updated upstream
=======
      // Try to get auth token (will open browser window if needed)
      this.authToken = await this.f1Auth.getAuthToken(forceReauth)
      if (this.authToken) {
        console.log('✅ F1TV Pro authenticated')
      }

>>>>>>> Stashed changes
      if (this.debugMode) {
        await this.connectDebugWebSocket()
      } else {
        const { token } = await this.negotiate()
        await this.connectWebSocket(token)
        await this.subscribe()
      }
    } catch (err) {
      console.error('❌ Error starting F1 client:', err)
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

<<<<<<< Updated upstream
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
        // console log message
        console.log('WebSocket message received:', event.data)
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
=======
  /**
   * Pre-negotiation step to get AWS ALB CORS cookie
   * This is required for SignalR Core connection
   *
   * Note: The OPTIONS request returns 405, but we can still extract the cookie
   * from the error response headers
   */
  private async preNegotiate(): Promise<void> {
    this.log('Pre-negotiating connection...')
    try {
      const response = await axios.options(this.negotiateUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          Accept: '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          Origin: 'https://www.formula1.com',
          Connection: 'keep-alive',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-site'
        },
        validateStatus: () => true // Accept all status codes
      })

      // Extract AWSALBCORS cookie even from error responses
      const cookies = response.headers['set-cookie']
      if (cookies) {
        const awsAlbCors = cookies.find((cookie) => cookie.startsWith('AWSALBCORS='))
        if (awsAlbCors) {
          this.awsAlbCorsCookie = awsAlbCors.split(';')[0]
          this.log('AWS ALB CORS cookie obtained:', this.awsAlbCorsCookie)
        }
      }

      if (!this.awsAlbCorsCookie) {
        this.log('Failed to obtain AWSALBCORS cookie, continuing without it')
      }
    } catch (error) {
      this.log('Pre-negotiation failed:', error)
      this.log('Continuing without pre-negotiation cookie')
    }
>>>>>>> Stashed changes
  }

  /**
   * Subscribe to F1 telemetry feeds
   */
<<<<<<< Updated upstream
  private async subscribe(): Promise<void> {
    if (!this.socket) throw new Error('Socket not connected')
=======
  private async connectSignalR(): Promise<void> {
    this.log('Connecting to SignalR Core...')
>>>>>>> Stashed changes

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
          'TimingData',
          'ContentStreams'
        ]
      ],
      I: 1
    }

<<<<<<< Updated upstream
    this.socket.send(JSON.stringify(subscribeMessage))
    console.log('Subscribed to F1 telemetry feed')
=======
    // Add cookie if we obtained it
    if (this.awsAlbCorsCookie) {
      headers['Cookie'] = this.awsAlbCorsCookie
    }

    const httpOptions: signalR.IHttpConnectionOptions = {
      headers,
      skipNegotiation: false,
      transport: signalR.HttpTransportType.WebSockets,
      withCredentials: true,
      // Add F1TV Pro auth token if available
      accessTokenFactory: this.authToken ? async () => this.authToken! : undefined
    }

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(this.connectionUrl, httpOptions)
      .withAutomaticReconnect()
      .configureLogging(
        this.enableLogging ? signalR.LogLevel.Trace : signalR.LogLevel.Error
      )
      .build()

    this.log('Setting up message handlers...')

    // Set up event handlers
    this.connection.onclose((error) => {
      console.log('⚠️  Connection closed')
      if (error) {
        this.log('Close error:', error)
      }
      this.isConnecting = false
    })

    this.connection.onreconnecting((error) => {
      console.log('🔄 Reconnecting...')
      if (error) {
        this.log('Reconnect reason:', error)
      }
    })

    this.connection.onreconnected((connectionId) => {
      console.log('✅ Reconnected')
      this.log('Connection ID:', connectionId)
    })

    // Handle 'feed' messages - SignalR Core format is (topic: string, data: any)
    this.connection.on('feed', (topic: string, data: unknown) => {
      this.log('=== FEED MESSAGE ===')
      this.log('Topic:', topic)
      this.log('Data:', JSON.stringify(data, null, 2).substring(0, 500))
      this.log('====================')
      this.handleFeedMessage(topic, data)
    })

    try {
      await this.connection.start()
      console.log('✅ Connected to F1 live timing')
      this.isConnecting = false

      // Subscribe to topics
      await this.subscribeToTopics()
    } catch (error) {
      console.error('❌ Failed to connect:', error)
      this.isConnecting = false
      throw error
    }
  }

  /**
   * Subscribe to F1 telemetry feeds using SignalR Core
   */
  private async subscribeToTopics(): Promise<void> {
    if (!this.connection) throw new Error('Connection not established')

    try {
      this.log('Subscribing to topics:', this.topics)
      const result = await this.connection.invoke('Subscribe', this.topics)
      this.log('Subscribe result:', result)

      // Check if result contains initial state data
      if (result && typeof result === 'object') {
        this.log('Processing initial state data...')
        // Process the result as it might contain initial state
        for (const [topic, data] of Object.entries(result as Record<string, unknown>)) {
          this.log(`Processing initial state for topic: ${topic}`)
          processMessage(topic, data, this.window)
        }
      }

      console.log('📡 Subscribed to live timing feeds')
    } catch (error) {
      console.error('❌ Failed to subscribe:', error)
      throw error
    }
  }

  /**
   * Handle incoming feed messages from SignalR
   * SignalR Core sends messages in the format: [topic, data] or as an object with topic as key
   */
  private handleFeedMessage(topic: string, data: unknown): void {
    if (this.enableLogging) {
      this.logMessage(JSON.stringify({ topic, data }))
    }

    try {
      this.log(`Processing feed message - Topic: ${topic}`)
      processMessage(topic, data, this.window)
    } catch (error) {
      console.error(`❌ Failed to process ${topic}:`, error)
    }
>>>>>>> Stashed changes
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
        reject(new Error('Failed to connect to debug WebSocket'))
      }

      this.socket.onmessage = (event) => {
        if (this.enableLogging) {
          this.logMessage(event.data)
        }

        try {
          const parsed = JSON.parse(event.data)

          // Replay script sends messages in format: { H: "Streaming", M: "feed", A: [topic, data] }
          if (parsed.H === 'Streaming' && parsed.M === 'feed' && parsed.A && parsed.A.length > 1) {
            const topic = parsed.A[0] as string
            const data = parsed.A[1]
            // Process exactly like live messages
            this.handleFeedMessage(topic, data)
          }
        } catch (error) {
          console.error('❌ Failed to parse debug message:', error)
        }
      }

      this.socket.onclose = (event) => {
        console.log('⚠️  Debug WebSocket closed')
        this.log('Close event:', event)
        this.window.webContents.send('debug-websocket-status', 'closed')
        this.isConnecting = false
        this.socket = null
      }
    })
  }
}
