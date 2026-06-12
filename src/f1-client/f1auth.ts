import * as jwt from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'
import fs from 'fs'
import path from 'path'
import * as http from 'http'
import { app, BrowserWindow, shell } from 'electron'

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
  private readonly f1LoginRelayBase = 'https://f1login.fastf1.dev'
  private readonly jwksUrl = 'https://api.formula1.com/static/jwks.json'

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
    // Try to load existing token from disk if not in memory
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
   * Authenticate with F1TV using the FastF1 relay service.
   *
   * Spins up a local HTTP server, then opens https://f1login.fastf1.dev?port={port}
   * in an Electron window. The relay site handles the F1 login and POSTs the
   * loginSession cookie value back to our local server, from which we extract
   * the subscriptionToken — exactly the same flow FastF1 uses.
   */
  private authenticate(): Promise<string> {
    return new Promise((resolve, reject) => {
      let settled = false

      const settle = (fn: () => void) => {
        if (!settled) {
          settled = true
          fn()
        }
      }

      const cleanup = (server: http.Server) => {
        server.close()
        if (this.authWindow) {
          this.authWindow.close()
          this.authWindow = null
        }
      }

      // Start a local HTTP server on an OS-assigned port to receive the callback
      const server = http.createServer((req, res) => {
        // Allow the relay site to POST back to us
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.writeHead(204)
          res.end()
          return
        }

        if (req.method === 'POST' && req.url === '/auth') {
          let body = ''
          req.on('data', (chunk) => (body += chunk))
          req.on('end', () => {
            res.writeHead(200)
            res.end('OK')

            try {
              const data = JSON.parse(body)
              const rawCookie: string = data.loginSession
              if (!rawCookie) throw new Error('No loginSession in POST body')

              const loginSession = JSON.parse(decodeURIComponent(rawCookie))
              const token =
                loginSession?.data?.subscriptionToken || loginSession?.subscriptionToken
              if (!token) throw new Error('No subscriptionToken found in loginSession')

              console.log('✅ F1TV authentication successful')

              const decoded = jwt.decode(token) as { exp?: number }
              const expiresAt = decoded?.exp
                ? decoded.exp * 1000
                : Date.now() + 24 * 60 * 60 * 1000

              this.authData = { token, expiresAt }
              this.saveAuthData()

              settle(() => {
                cleanup(server)
                resolve(token)
              })
            } catch (err) {
              console.error('❌ Error parsing auth callback:', err)
              settle(() => {
                cleanup(server)
                reject(err)
              })
            }
          })
          return
        }

        res.writeHead(404)
        res.end()
      })

      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as { port: number }
        const port = addr.port
        const loginUrl = `${this.f1LoginRelayBase}?port=${port}`

        console.log(`🔐 Opening F1TV login in system browser (local port ${port})...`)
        console.log(`   Login URL: ${loginUrl}`)

        // Open in the system browser so the FastF1 Companion extension is available
        shell.openExternal(loginUrl)

        // Show a small instructional window so the user knows what's happening
        this.authWindow = new BrowserWindow({
          width: 480,
          height: 220,
          title: 'F1 TV Login',
          resizable: false,
          minimizable: false,
          fullscreenable: false,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
          }
        })

        this.authWindow.loadURL(
          `data:text/html,<html><body style="font-family:sans-serif;padding:24px;background:#1a1a1a;color:#fff;text-align:center">` +
            `<h2 style="margin-top:0">F1 TV Login</h2>` +
            `<p>A login page has been opened in your browser.</p>` +
            `<p style="color:#aaa;font-size:13px">Make sure the <strong>FastF1 Companion</strong> extension is installed.<br>` +
            `This window will close automatically after login.</p>` +
            `</body></html>`
        )

        this.authWindow.on('closed', () => {
          this.authWindow = null
          settle(() => {
            server.close()
            reject(new Error('Authentication cancelled'))
          })
        })

        // 10-minute timeout
        setTimeout(
          () => {
            settle(() => {
              cleanup(server)
              reject(new Error('Authentication timeout'))
            })
          },
          10 * 60 * 1000
        )
      })

      server.on('error', (err) => {
        settle(() => {
          reject(new Error(`Local auth server error: ${err.message}`))
        })
      })
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
