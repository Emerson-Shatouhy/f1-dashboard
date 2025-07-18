/// <reference types="vite/client" />

import { ElectronAPI } from '@electron-toolkit/preload'

interface Window {
  electron: ElectronAPI
  api: unknown
  liveTiming: {
    startF1Client: () => Promise<void>
  }
}
