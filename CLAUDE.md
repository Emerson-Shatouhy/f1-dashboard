# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Formula 1?

Formula 1 (F1) is the highest class of international auto racing for single-seater formula cars. It features a global series of races (Grands Prix) where teams and drivers compete using high-performance vehicles packed with telemetry, strategy, and real-time data. F1 is not only a sporting spectacle but also a data-rich environment that broadcasts detailed timing, positioning, and car telemetry throughout each race session.

## Project Purpose

This project is an Electron-based desktop application for displaying F1 live timing data in real time, similar to the official F1 app or live timing web dashboards. Its goals are:

Connect to the official F1 SignalR WebSocket feed used by Formula1.com
Receive and decode live telemetry and timing data
Process compressed and encoded F1 messages
Display real-time race data in a modern, customizable desktop UI
Support local debug mode for developing with saved or simulated data
It is intended for enthusiasts, engineers, or broadcasters who want deeper insight into live F1 sessions or wish to build custom tooling on top of raw F1 data.

## Development Commands

### Package Manager

This project uses `pnpm` as the package manager. Install dependencies with:

```bash
pnpm install
```

### Development

- `pnpm run dev` - Start development mode with hot reload
- `pnpm run start` - Preview the built application

### Build Commands

- `pnpm run build` - Build the application (includes typecheck)
- `pnpm run build:win` - Build for Windows
- `pnpm run build:mac` - Build for macOS
- `pnpm run build:linux` - Build for Linux
- `pnpm run build:unpack` - Build and unpack (for development testing)

### Code Quality

- `pnpm run lint` - Run ESLint
- `pnpm run format` - Format code with Prettier
- `pnpm run typecheck` - Run TypeScript type checking
- `pnpm run typecheck:node` - Type check Node.js code (main/preload)
- `pnpm run typecheck:web` - Type check web/renderer code

## Architecture Overview

This is an Electron application that displays F1 live timing data. The architecture follows a standard Electron pattern with three main processes:

### Main Process (`src/main/`)

- **Entry point**: `src/main/index.ts`
- Creates the main window and handles F1 client connections
- Manages IPC communication with renderer
- Configures CORS settings for F1 API access
- Instantiates `LiveTimingClient` for WebSocket connections

### Preload Process (`src/preload/`)

- Bridge between main and renderer processes
- Exposes safe APIs to the renderer via `window.api`

### Renderer Process (`src/renderer/`)

- **Entry point**: `src/renderer/src/main.tsx`
- React application with TypeScript
- Uses Zustand for state management
- Styled with Tailwind CSS

## F1 Live Timing System

### Core Components

- **LiveTimingClient** (`src/f1-client/liveTimingClient.ts`): WebSocket client that connects to F1's SignalR hub
- **Message Handlers** (`src/f1-client/messageHandlers.ts`): Processes different types of F1 data messages
- **Debug Mode**: Can connect to local WebSocket at `ws://localhost:5001` for testing

### Data Flow

1. F1 client negotiates connection token with Formula1.com SignalR hub
2. Establishes WebSocket connection and subscribes to timing feeds
3. Receives compressed/encoded data streams
4. Processes messages through type-specific handlers
5. Sends data to renderer via IPC events

### Supported Data Types

- DriverList, SessionInfo, TrackStatus
- TimingData, TimingStats, TimingAppData
- WeatherData, RaceControlMessages
- CarData.z, Position.z (compressed telemetry)
- Heartbeat, LapCount

## State Management

Uses Zustand stores located in `src/renderer/src/stores/`:

- **driverStore.ts**: Driver information and updates
- **driverTimingStore.ts**: Timing data for drivers
- **heartbeatStore.ts**: Connection heartbeat
- **lapCountStore.ts**: Race lap information
- **raceControlMessagesStore.ts**: Race control messages
- **weatherStore.ts**: Weather conditions

### Store Pattern

Stores use immutable updates and only trigger re-renders when data actually changes. The `useStoreSubscriptions` hook sets up IPC listeners that update stores when new F1 data arrives.

## UI Components

Located in `src/renderer/src/components/`:

- **DriverList.tsx**: Main timing table showing all drivers
- **SessionInfo.tsx**: Session details and track information
- **Timing/**: Driver timing components (DriverLine, SectorInfo, DRS)
- **RaceControlMessages/**: Race control message display
- **badges/**: Driver badges and track status indicators
- **liveTiming/**: Connection status and timing utilities

## Project Structure

- `src/main/` - Electron main process
- `src/preload/` - Electron preload scripts
- `src/renderer/` - React frontend application
- `src/f1-client/` - F1 live timing client and message handling
- `resources/` - Application assets (icons, etc.)
- `out/` - Built application output
- `logs/` - F1 message logs (when logging enabled)

## Development Notes

- Uses `electron-vite` for build tooling
- TypeScript configuration split between node and web environments
- ESLint configured for Electron + React + TypeScript
- CORS disabled and custom headers set for F1 API access
- Debug mode available for local WebSocket testing
- Message logging can be enabled for debugging F1 data streams
