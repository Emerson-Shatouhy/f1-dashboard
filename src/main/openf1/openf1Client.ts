import axios, { AxiosInstance, AxiosResponse } from 'axios'

export interface OpenF1ApiConfig {
  baseURL?: string
  timeout?: number
}

/**
 * Modular OpenF1 API client for the main process
 * Handles all HTTP requests to the OpenF1 API endpoints
 */
export class OpenF1Client {
  private client: AxiosInstance

  constructor(config: OpenF1ApiConfig = {}) {
    this.client = axios.create({
      baseURL: config.baseURL || 'https://api.openf1.org/v1',
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'F1-Dashboard-Electron'
      }
    })
  }

  /**
   * Generic GET request method
   */
  private async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    try {
      const config = { params }

      // Construct full URL for debugging
      const url = new URL(endpoint, this.client.defaults.baseURL)
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, String(value))
        })
      }

      console.log(`[OpenF1 Client] GET ${url.toString()}`)

      const response: AxiosResponse<T> = await this.client.get(endpoint, config)

      const dataLength = Array.isArray(response.data) ? response.data.length : 'N/A'
      console.log(`[OpenF1 Client] ✓ ${endpoint} - ${response.status} - ${dataLength} items`)

      return response.data
    } catch (error) {
      console.error(`[OpenF1 API Error] [${endpoint}]:`, error)
      if (axios.isAxiosError(error)) {
        console.error(`[OpenF1 API Error] Status:`, error.response?.status)
        console.error(`[OpenF1 API Error] Response:`, error.response?.data)
      }
      throw error
    }
  }

  /**
   * Sessions API endpoints
   */
  async getSessions(params?: {
    circuit_key?: number
    session_type?: string
    session_name?: string
    year?: number
    country_name?: string
    location?: string
    session_key?: number
  }): Promise<unknown> {
    return this.get('/sessions', params)
  }

  /**
   * Meetings API endpoints
   */
  async getMeetings(params?: {
    meeting_key?: number
    year?: number
    country_name?: string
    circuit_key?: number
    circuit_short_name?: string
  }): Promise<unknown> {
    return this.get('/meetings', params)
  }

  /**
   * Drivers API endpoints
   */
  async getDrivers(params?: {
    driver_number?: number
    broadcast_name?: string
    full_name?: string
    name_acronym?: string
    team_name?: string
    session_key?: number
  }): Promise<unknown> {
    return this.get('/drivers', params)
  }

  /**
   * Position API endpoints
   */
  async getPosition(params?: {
    session_key?: number
    driver_number?: number
    date?: string
  }): Promise<unknown> {
    return this.get('/position', params)
  }

  /**
   * Car Data API endpoints
   */
  async getCarData(params?: {
    session_key?: number
    driver_number?: number
    speed?: number
    date?: string
  }): Promise<unknown> {
    return this.get('/car_data', params)
  }

  /**
   * Laps API endpoints
   */
  async getLaps(params?: {
    session_key?: number
    driver_number?: number
    lap_number?: number
  }): Promise<unknown> {
    return this.get('/laps', params)
  }

  /**
   * Pit API endpoints
   */
  async getPit(params?: { session_key?: number; driver_number?: number }): Promise<unknown> {
    return this.get('/pit', params)
  }

  /**
   * Race Control API endpoints
   */
  async getRaceControl(params?: {
    session_key?: number
    category?: string
    date?: string
  }): Promise<unknown> {
    return this.get('/race_control', params)
  }

  /**
   * Team Radio API endpoints
   */
  async getTeamRadio(params?: {
    session_key?: number
    driver_number?: number
    date?: string
  }): Promise<unknown> {
    return this.get('/team_radio', params)
  }

  /**
   * Weather API endpoints
   */
  async getWeather(params?: { session_key?: number; date?: string }): Promise<unknown> {
    return this.get('/weather', params)
  }

  /**
   * Intervals API endpoints
   */
  async getIntervals(params?: { session_key?: number; date?: string }): Promise<unknown> {
    return this.get('/intervals', params)
  }

  /**
   * Stints API endpoints
   */
  async getStints(params?: {
    session_key?: number
    driver_number?: number
    compound?: string
  }): Promise<unknown> {
    return this.get('/stints', params)
  }

  /**
   * Session results API endpoints
   */
  async getSessionResults(params?: {
    session_key?: number
    year?: number
    position?: number
  }): Promise<unknown> {
    return this.get('/session_result', params)
  }

  /**
   * Location API endpoints
   */
  async getLocation(params?: {
    session_key?: number
    driver_number?: number
    date?: string
    start_date?: string
    end_date?: string
  }): Promise<unknown> {
    // Handle date range filtering by constructing proper query parameters
    let queryParams: Record<string, unknown> = params || {}
    if (params?.start_date && params?.end_date) {
      const { start_date, end_date, ...otherParams } = params
      queryParams = {
        ...otherParams,
        'date>': start_date,
        'date<': end_date
      }
    }

    const result = await this.get('/location', queryParams)

    // Check if result is an empty array and throw a descriptive error
    if (Array.isArray(result) && result.length === 0) {
      const errorMsg = `[OpenF1 Client] Location API returned empty array for params: ${JSON.stringify(queryParams)}`
      console.error(errorMsg)
      throw new Error(
        `No location data found. This could mean:\n` +
          `  1. The session/driver combination doesn't have location data\n` +
          `  2. The date range is incorrect\n` +
          `  3. The session hasn't been processed by OpenF1 yet\n` +
          `  Params: ${JSON.stringify(queryParams, null, 2)}`
      )
    }

    return result
  }
}
