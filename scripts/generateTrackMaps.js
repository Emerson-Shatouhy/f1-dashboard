#!/usr/bin/env node

/**
 * Script to generate track map JSON files for all F1 circuits
 * Run with: node scripts/generateTrackMaps.js
 *
 * This will fetch track map data from the OpenF1 API and save it to
 * resources/track-maps/{circuit_key}.json files
 */

const fs = require('fs')
const path = require('path')

// Paths
const OUTPUT_DIR = path.join(__dirname, '../resources/track-maps')

// Rate limiter to avoid hitting API limits (max 3 req/sec)
class RateLimiter {
  constructor() {
    this.queue = []
    this.processing = false
    this.lastRequestTime = 0
    this.minInterval = 350 // 350ms = ~2.85 req/sec
  }

  async execute(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })

      if (!this.processing) {
        this.processQueue()
      }
    })
  }

  async processQueue() {
    this.processing = true

    while (this.queue.length > 0) {
      const now = Date.now()
      const timeSinceLastRequest = now - this.lastRequestTime

      if (timeSinceLastRequest < this.minInterval) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.minInterval - timeSinceLastRequest)
        )
      }

      const task = this.queue.shift()
      if (task) {
        this.lastRequestTime = Date.now()
        await task()
      }
    }

    this.processing = false
  }
}

const rateLimiter = new RateLimiter()

// Fetch wrapper with rate limiting
async function fetchWithRateLimit(url) {
  return rateLimiter.execute(async () => {
    console.log(`  → Fetching: ${url}`)
    const response = await fetch(url)

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`API error: ${response.status} ${response.statusText} - ${text}`)
    }

    return response.json()
  })
}

async function getTrackMapForCircuit(meeting) {
  try {
    const { circuit_key, circuit_short_name, country_name, circuit_info_url } = meeting

    console.log(`\n[${circuit_key}] ${circuit_short_name} (${country_name})`)

    if (!circuit_info_url) {
      console.log(`  ⚠️  No circuit_info_url available`)
      return null
    }

    // Fetch circuit info which contains x, y coordinates
    const circuitInfo = await fetchWithRateLimit(circuit_info_url)

    if (!circuitInfo.x || !circuitInfo.y) {
      console.log(`  ⚠️  No x/y coordinate data in circuit info`)
      return null
    }

    // Convert x, y arrays to track positions
    const positions = []
    for (let i = 0; i < circuitInfo.x.length; i++) {
      positions.push({
        x: circuitInfo.x[i],
        y: circuitInfo.y[i],
        z: 0, // Z is not provided in the API, default to 0
        timestamp: '' // Not relevant for static track maps
      })
    }

    console.log(`  ✅ Got ${positions.length} position points`)

    // Calculate sector boundaries (divide track into 3 sectors)
    const sectorBoundaries = calculateSectorBoundaries(positions)

    return {
      circuit_key: circuit_key,
      circuit_name: meeting.meeting_name || circuit_short_name,
      circuit_short_name: circuit_short_name,
      country: country_name,
      positions,
      sector_boundaries: sectorBoundaries,
      start_line: positions[0] || { x: 0, y: 0, z: 0, timestamp: '' },
      metadata: {
        source_session_key: 0,
        source_year: circuitInfo.year || new Date().getFullYear(),
        source_session_type: 'Static Track Map',
        total_points: positions.length,
        rotation: circuitInfo.rotation
      }
    }
  } catch (error) {
    console.error(`  ❌ Error fetching track map:`, error.message)
    return null
  }
}

function calculateSectorBoundaries(positions) {
  if (positions.length === 0) return []

  const totalPositions = positions.length
  const sector1End = Math.floor(totalPositions / 3)
  const sector2End = Math.floor((totalPositions * 2) / 3)

  return [
    {
      sector: 1,
      start: positions[0],
      end: positions[sector1End - 1] || positions[0]
    },
    {
      sector: 2,
      start: positions[sector1End] || positions[0],
      end: positions[sector2End - 1] || positions[0]
    },
    {
      sector: 3,
      start: positions[sector2End] || positions[0],
      end: positions[positions.length - 1]
    }
  ]
}

// Main execution
async function main() {
  console.log('🏎️  F1 Track Map Generator')
  console.log('='.repeat(50))

  // Fetch all meetings
  console.log('\nFetching meetings from OpenF1 API...')
  const meetings = await fetchWithRateLimit('https://api.openf1.org/v1/meetings')

  // Get unique circuits (meetings can have multiple races per circuit)
  const circuitMap = new Map()
  for (const meeting of meetings) {
    if (!circuitMap.has(meeting.circuit_key)) {
      circuitMap.set(meeting.circuit_key, meeting)
    }
  }

  const uniqueCircuits = Array.from(circuitMap.values())
  console.log(`Found ${uniqueCircuits.length} unique circuits\n`)

  // Generate index.json
  const indexData = {
    version: '1.0.0',
    last_updated: new Date().toISOString(),
    circuits: uniqueCircuits.map(m => ({
      circuit_key: m.circuit_key,
      name: m.meeting_name || m.circuit_short_name,
      short_name: m.circuit_short_name,
      country: m.country_name,
      filename: `${m.circuit_key}.json`
    })).sort((a, b) => a.circuit_key - b.circuit_key)
  }

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'index.json'),
    JSON.stringify(indexData, null, 2)
  )
  console.log('✅ Generated index.json\n')

  let successCount = 0
  let failCount = 0

  for (const meeting of uniqueCircuits) {
    const trackMap = await getTrackMapForCircuit(meeting)

    if (trackMap) {
      // Save to file
      const outputPath = path.join(OUTPUT_DIR, `${meeting.circuit_key}.json`)
      fs.writeFileSync(outputPath, JSON.stringify(trackMap, null, 2))
      console.log(`  💾 Saved to ${meeting.circuit_key}.json`)
      successCount++
    } else {
      failCount++
    }

    // Small delay between circuits
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  console.log('\n' + '='.repeat(50))
  console.log(`✅ Success: ${successCount}`)
  console.log(`❌ Failed: ${failCount}`)
  console.log(`📁 Output directory: ${OUTPUT_DIR}`)
}

main().catch(console.error)
