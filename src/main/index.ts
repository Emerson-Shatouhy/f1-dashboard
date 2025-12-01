import { app, shell, BrowserWindow, ipcMain, session } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import icon from '../../resources/icon.png?asset'
import { LiveTimingClient } from '../f1-client/liveTimingClient'
import { OpenF1Client } from './openf1/openf1Client'
import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer'

let liveTimingClient: LiveTimingClient | null = null
let openF1Client: OpenF1Client | null = null
let mainWindow: BrowserWindow

// Configure auto-updater
if (!is.dev) {
  autoUpdater.checkForUpdatesAndNotify()
}

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...')
  if (mainWindow) {
    mainWindow.webContents.send('update-checking')
  }
})

autoUpdater.on('update-available', (info) => {
  console.log('Update available.')
  if (mainWindow) {
    mainWindow.webContents.send('update-available', info)
  }
})

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available.')
  if (mainWindow) {
    mainWindow.webContents.send('update-not-available', info)
  }
})

autoUpdater.on('error', (err) => {
  console.log('Error in auto-updater. ' + err)
  if (mainWindow) {
    mainWindow.webContents.send('update-error', err)
  }
})

autoUpdater.on('download-progress', (progressObj) => {
  let log_message = 'Download speed: ' + progressObj.bytesPerSecond
  log_message = log_message + ' - Downloaded ' + progressObj.percent + '%'
  log_message = log_message + ' (' + progressObj.transferred + '/' + progressObj.total + ')'
  console.log(log_message)
  if (mainWindow) {
    mainWindow.webContents.send('update-download-progress', progressObj)
  }
})

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded')
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded', info)
  }
})

function createWindow(): void {
  // Install React Developer Tools in development mode
  if (is.dev) {
    installExtension(REACT_DEVELOPER_TOOLS)
      .then((name) => console.log(`Added Extension: ${name}`))
      .catch((err) => console.log('An error occurred: ', err))
  }

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false, // Disable web security to allow CORS
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  // Configure CORS
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    callback({
      requestHeaders: {
        ...details.requestHeaders,
        Origin: 'https://livetiming.formula1.com'
      }
    })
  })

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Access-Control-Allow-Origin': ['*'],
        'Access-Control-Allow-Methods': ['*'],
        'Access-Control-Allow-Headers': ['*']
      }
    })
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Initialize OpenF1 client
  if (!openF1Client) {
    openF1Client = new OpenF1Client()
  }

  // Handle IPC calls
  ipcMain.handle('start-f1-client', async () => {
    try {
      if (!liveTimingClient) {
        // Set to true for development, false for production
        liveTimingClient = new LiveTimingClient(mainWindow, false, false)
      }
      await liveTimingClient.start()
    } catch (error) {
      console.error('Error starting F1 client:', error)
      throw error // Re-throw to let renderer know about the error
    }
  })

  // OpenF1 API IPC handlers
  ipcMain.handle('openf1-get-sessions', async (_event, params) => {
    try {
      return await openF1Client!.getSessions(params)
    } catch (error) {
      console.error('Error fetching OpenF1 sessions:', error)
      throw error
    }
  })

  ipcMain.handle('openf1-get-meetings', async (_event, params) => {
    try {
      return await openF1Client!.getMeetings(params)
    } catch (error) {
      console.error('Error fetching OpenF1 meetings:', error)
      throw error
    }
  })

  ipcMain.handle('openf1-get-drivers', async (_event, params) => {
    try {
      return await openF1Client!.getDrivers(params)
    } catch (error) {
      console.error('Error fetching OpenF1 drivers:', error)
      throw error
    }
  })

  ipcMain.handle('openf1-get-position', async (_event, params) => {
    try {
      return await openF1Client!.getPosition(params)
    } catch (error) {
      console.error('Error fetching OpenF1 position:', error)
      throw error
    }
  })

  ipcMain.handle('openf1-get-car-data', async (_event, params) => {
    try {
      return await openF1Client!.getCarData(params)
    } catch (error) {
      console.error('Error fetching OpenF1 car data:', error)
      throw error
    }
  })

  ipcMain.handle('openf1-get-laps', async (_event, params) => {
    try {
      return await openF1Client!.getLaps(params)
    } catch (error) {
      console.error('Error fetching OpenF1 laps:', error)
      throw error
    }
  })

  ipcMain.handle('openf1-get-pit', async (_event, params) => {
    try {
      return await openF1Client!.getPit(params)
    } catch (error) {
      console.error('Error fetching OpenF1 pit data:', error)
      throw error
    }
  })

  ipcMain.handle('openf1-get-race-control', async (_event, params) => {
    try {
      return await openF1Client!.getRaceControl(params)
    } catch (error) {
      console.error('Error fetching OpenF1 race control:', error)
      throw error
    }
  })

  ipcMain.handle('openf1-get-team-radio', async (_event, params) => {
    try {
      return await openF1Client!.getTeamRadio(params)
    } catch (error) {
      console.error('Error fetching OpenF1 team radio:', error)
      throw error
    }
  })

  ipcMain.handle('openf1-get-weather', async (_event, params) => {
    try {
      return await openF1Client!.getWeather(params)
    } catch (error) {
      console.error('Error fetching OpenF1 weather:', error)
      throw error
    }
  })

  ipcMain.handle('openf1-get-intervals', async (_event, params) => {
    try {
      return await openF1Client!.getIntervals(params)
    } catch (error) {
      console.error('Error fetching OpenF1 intervals:', error)
      throw error
    }
  })

  ipcMain.handle('openf1-get-stints', async (_event, params) => {
    try {
      return await openF1Client!.getStints(params)
    } catch (error) {
      console.error('Error fetching OpenF1 stints:', error)
      throw error
    }
  })

  ipcMain.handle('openf1-get-session-results', async (_event, params) => {
    try {
      return await openF1Client!.getSessionResults(params)
    } catch (error) {
      console.error('Error fetching OpenF1 session results:', error)
      throw error
    }
  })

  ipcMain.handle('openf1-get-location', async (_event, params) => {
    try {
      return await openF1Client!.getLocation(params)
    } catch (error) {
      console.error('Error fetching OpenF1 location:', error)
      throw error
    }
  })

  // Auto-updater IPC handlers
  ipcMain.handle('check-for-updates', () => {
    autoUpdater.checkForUpdatesAndNotify()
  })

  ipcMain.handle('restart-and-update', () => {
    autoUpdater.quitAndInstall()
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
