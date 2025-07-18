# F1 Dashboard

An Electron application that displays Formula 1 live timing data with a clean, modern interface.

## Features

- Real-time F1 timing data
- Driver information and lap times
- Weather conditions
- Race control messages
- Session information and track status

## Installation

This project uses `pnpm` as the package manager.

```bash
# Clone the repository
git clone https://github.com/emerson-shatouhy/f1-dashboard.git
cd f1-dashboard

# Install dependencies
pnpm install
```

## Running the Application

### Development Mode

```bash
# Start with hot reload
pnpm run dev
```

### Production Mode

```bash
# Build the application
pnpm run build

# Preview the built app
pnpm run start
```

## Build for Distribution

Build for your platform:

```bash
# Build for all platforms
pnpm run build

# Platform-specific builds
pnpm run build:win    # Windows
pnpm run build:mac    # macOS
pnpm run build:linux  # Linux
```

For testing purposes, you can build and unpack without creating installers:

```bash
pnpm run build:unpack
```

## Code Quality Tools

```bash
# Lint code
pnpm run lint

# Format code
pnpm run format

# Type checking
pnpm run typecheck
```

## Technology Stack

- **Electron**: Cross-platform desktop application framework
- **React**: UI library
- **TypeScript**: Type-safe JavaScript
- **Zustand**: State management
- **Tailwind CSS**: Styling

## Development Notes

- F1 data is accessed via WebSocket connections to the official Formula1.com SignalR hub
- Debug mode available for local WebSocket testing at `ws://localhost:5001`
- Message logging can be enabled for debugging data streams

## Architecture

The application follows the standard Electron architecture with:
- **Main Process**: Handles F1 client connections and IPC
- **Renderer Process**: React-based UI
- **Preload Script**: Secure bridge between processes

