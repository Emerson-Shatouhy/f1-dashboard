import * as jwt from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'
import fs from 'fs'
import path from 'path'
import { app, BrowserWindow } from 'electron'

interface F1AuthData {
  token: string
  expiresAt: number
}

export class F1Auth {
  private authData: F1AuthData | null = null
  private authFilePath: string
  private jwksClient: jwksClient.JwksClient
  private authWindow: BrowserWindow | null = null

  // F1TV API endpoints
  private readonly authLoginUrl = 'https://account.formula1.com/#/en/login'
  private readonly jwksUrl = 'https://api.formula1.com/static/jwks.json'
  private readonly cookieName = 'login-session'
  private readonly f1Domain = '.formula1.com'

  constructor() {
    // Store auth data in app's user data directory
    const userDataPath = app.getPath('userData')
    this.authFilePath = path.join(userDataPath, 'f1auth.json')

    // Initialize JWKS client for token verification
    this.jwksClient = jwksClient({
      jwksUri: this.jwksUrl,
      cache: true,
      rateLimit: true
    })
  }

  /**
   * Get authentication token (from cache or by initiating browser login)
   * @param forceReauth Force re-authentication even if cached token exists
   * @returns JWT token string
   */
  public async getAuthToken(forceReauth: boolean = false): Promise<string | null> {
    // Try to load existing token
    if (!this.authData) {
      this.loadAuthData()
    }

    // Validate existing token if not forcing re-auth
    if (!forceReauth && this.authData) {
      try {
        const isValid = await this.validateToken(this.authData.token)
        if (isValid) {
          return this.authData.token
        } else {
          this.authData = null
        }
      } catch (error) {
        this.authData = null
      }
    }

    // Initiate browser-based authentication
    return await this.authenticate()
  }

  /**
   * Authenticate with F1TV using browser-based login flow
   * Opens a browser window to F1 TV login page and extracts the JWT token
   * from the login-session cookie after successful authentication
   */
  private async authenticate(): Promise<string> {
    return new Promise((resolve, reject) => {
      // Create a new browser window for authentication with proper session
      this.authWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        title: 'F1 TV Login',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          partition: 'persist:f1auth', // Use persistent session for cookies
          webSecurity: true
        }
      })

      // Set a proper user agent to avoid detection
      this.authWindow.webContents.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      )

      // Enable web features that might be needed
      this.authWindow.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
        callback({ requestHeaders: { ...details.requestHeaders } })
      })

      // Load the F1 TV login page
      console.log('🔐 Opening F1 TV login page...')

      // Handle any load failures
      this.authWindow.webContents.on(
        'did-fail-load',
        (_event, errorCode, errorDescription, validatedURL) => {
          console.error('❌ Failed to load auth page:', errorCode, errorDescription, validatedURL)
        }
      )

      this.authWindow.loadURL(this.authLoginUrl)

      // Set up cookie monitoring
      let cookieCheckCount = 0
      const checkInterval = setInterval(async () => {
        try {
          cookieCheckCount++

          // Look for the login-session cookie
          const cookies = await this.authWindow?.webContents.session.cookies.get({
            domain: this.f1Domain,
            name: this.cookieName
          })

          // Log progress every 10 seconds
          if (cookieCheckCount % 10 === 0) {
            console.log(`⏳ Waiting for login... (${cookieCheckCount}s)`)
          }

          if (cookies && cookies.length > 0) {
            const loginSessionCookie = cookies[0]

            try {
              // The cookie value is URL-encoded JSON
              const loginSessionJson = decodeURIComponent(loginSessionCookie.value)
              const loginSession = JSON.parse(loginSessionJson)

              // Extract subscriptionToken from the loginSession
              // The token can be at root level or nested under 'data'
              const token =
                loginSession.subscriptionToken || loginSession.data?.subscriptionToken
              if (!token) {
                throw new Error('No subscriptionToken found in login-session cookie')
              }

              console.log('✅ Authentication successful')

              // Decode token to get expiration
              const decoded = jwt.decode(token) as { exp?: number }
              const expiresAt = decoded?.exp ? decoded.exp * 1000 : Date.now() + 24 * 60 * 60 * 1000

              // Save auth data
              this.authData = { token, expiresAt }
              this.saveAuthData()

              // Clean up
              clearInterval(checkInterval)
              this.authWindow?.close()
              this.authWindow = null

              resolve(token)
            } catch (error) {
              console.error('❌ Error parsing authentication:', error)
              clearInterval(checkInterval)
              this.authWindow?.close()
              this.authWindow = null
              reject(error)
            }
          }
        } catch (error) {
          // Ignore errors during cookie check (window might be closed)
        }
      }, 1000) // Check every second

      // Handle window close
      this.authWindow.on('closed', () => {
        clearInterval(checkInterval)
        this.authWindow = null
        reject(new Error('Authentication cancelled'))
      })

      // Set timeout for authentication (10 minutes)
      setTimeout(() => {
        if (this.authWindow) {
          clearInterval(checkInterval)
          this.authWindow.close()
          this.authWindow = null
          reject(new Error('Authentication timeout'))
        }
      }, 10 * 60 * 1000)
    })
  }

  /**
   * Validate JWT token using F1's JWKS
   */
  private async validateToken(token: string): Promise<boolean> {
    try {
      // Decode without verification to get header
      const decoded = jwt.decode(token, { complete: true })
      if (!decoded || !decoded.header.kid) {
        return false
      }

      // Get signing key from JWKS
      const key = await this.jwksClient.getSigningKey(decoded.header.kid)
      const publicKey = key.getPublicKey()

      // Verify token
      jwt.verify(token, publicKey, {
        algorithms: ['RS256']
      })

      // Check if token is expired
      const payload = decoded.payload as { exp?: number }
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return false
      }

      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Load auth data from disk
   */
  private loadAuthData(): void {
    try {
      if (fs.existsSync(this.authFilePath)) {
        const data = fs.readFileSync(this.authFilePath, 'utf-8')
        this.authData = JSON.parse(data)
      }
    } catch (error) {
      this.authData = null
    }
  }

  /**
   * Save auth data to disk
   */
  private saveAuthData(): void {
    try {
      if (this.authData) {
        fs.writeFileSync(this.authFilePath, JSON.stringify(this.authData, null, 2))
      }
    } catch (error) {
      console.error('❌ Failed to save auth data:', error)
    }
  }

  /**
   * Clear stored authentication
   */
  public clearAuth(): void {
    this.authData = null
    try {
      if (fs.existsSync(this.authFilePath)) {
        fs.unlinkSync(this.authFilePath)
        console.log('🗑️  Cleared authentication')
      }
    } catch (error) {
      console.error('❌ Failed to clear auth data:', error)
    }
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return this.authData !== null
  }
}
