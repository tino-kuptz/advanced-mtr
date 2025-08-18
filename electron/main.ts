import { app, BrowserWindow, ipcMain, Menu, dialog, shell } from 'electron'
import { join } from 'path'
import { MtrService } from './services/MtrService'
import { ExportService } from './services/ExportService'
import { ImportService } from './services/ImportService'

let mainWindow: BrowserWindow | null = null
let mtrService: MtrService | null = null
let currentMtrData: {
  config: any
  hops: Map<number, any>
} | null = null

function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Datei',
      submenu: [
        {
          label: 'MTR speichern',
          accelerator: 'CmdOrCtrl+S',
          click: async () => {
            if (!currentMtrData) {
              dialog.showMessageBox(mainWindow!, {
                type: 'info',
                title: 'Keine Daten',
                message: 'Es sind keine MTR-Daten zum Speichern verfügbar.'
              })
              return
            }

            const result = await dialog.showSaveDialog(mainWindow!, {
              title: 'MTR-Daten speichern',
              defaultPath: `mtr-${currentMtrData.config.target}-${new Date().toISOString().split('T')[0]}.mtr`,
              filters: [
                { name: 'MTR-Dateien', extensions: ['mtr'] },
                { name: 'Alle Dateien', extensions: ['*'] }
              ]
            })

            if (!result.canceled && result.filePath) {
              try {
                ExportService.exportToFile(
                  result.filePath,
                  currentMtrData.config,
                  currentMtrData.hops
                )
                dialog.showMessageBox(mainWindow!, {
                  type: 'info',
                  title: 'Erfolgreich gespeichert',
                  message: `MTR-Daten wurden erfolgreich in ${result.filePath} gespeichert.`
                })
              } catch (error) {
                dialog.showErrorBox('Fehler beim Speichern', `Fehler: ${error.message}`)
              }
            }
          }
        },
        {
          label: 'MTR laden',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow!, {
              title: 'MTR-Datei öffnen',
              filters: [
                { name: 'MTR-Dateien', extensions: ['mtr'] },
                { name: 'Alle Dateien', extensions: ['*'] }
              ],
              properties: ['openFile']
            })

            if (!result.canceled && result.filePaths.length > 0) {
              const filePath = result.filePaths[0]

              try {
                if (!ExportService.validateFile(filePath)) {
                  dialog.showErrorBox('Ungültige Datei', 'Die ausgewählte Datei ist keine gültige MTR-Datei.')
                  return
                }

                const rawImportedData = ExportService.importFromFile(filePath)

                // Process the data with the ImportService
                const processedData = ImportService.processImportedData(rawImportedData)

                // Create MtrHop objects for the backend
                const hopObjects = ImportService.createMtrHopObjects(rawImportedData)

                // Set the current MTR data
                currentMtrData = {
                  config: processedData.config,
                  hops: hopObjects
                }

                // Send processed data to the frontend
                mainWindow?.webContents.send('mtr-data-imported', processedData)

                dialog.showMessageBox(mainWindow!, {
                  type: 'info',
                  title: 'Erfolgreich geladen',
                  message: `MTR-Daten wurden erfolgreich aus ${filePath} geladen.`
                })
              } catch (error) {
                dialog.showErrorBox('Fehler beim Laden', `Fehler: ${error.message}`)
              }
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Beenden',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit()
          }
        }
      ]
    },
    {
      label: 'Bearbeiten',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'Ansicht',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1020,
    height: 600,
    minWidth: 890,
    minHeight: 520,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js')
    },
    show: false
  })

  // Create menu
  createMenu()

  // Content Security Policy setzen
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' http://localhost:* ws://localhost:*;"
        ]
      }
    })
  })

  // Open links with target=_blank in standard browser
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })


  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // In development mode, we load from localhost:5173
  // In production mode, we load from the dist folder
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)

// Cleanup handlers for app shutdown
app.on('before-quit', () => {
  if (mtrService) {
    mtrService.cleanup()
    mtrService = null
  }
  currentMtrData = null
})

app.on('window-all-closed', () => {
  // Cleanup before quitting
  if (mtrService) {
    mtrService.cleanup()
    mtrService = null
  }
  currentMtrData = null
  
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// IPC handlers for MTR
ipcMain.handle('start-mtr', async (event, mtrConfig) => {
  try {
    mtrService = new MtrService()

    // Initialize current MTR data
    currentMtrData = {
      config: mtrConfig,
      hops: new Map()
    }

    // Event handlers for MTR updates
    mtrService.on('hop-found', async (hop: any) => {
      // Add hop to current data (as MtrHop instance)
      if (currentMtrData) {
        // Find the original MtrHop instance from MtrService
        const originalHop = mtrService?.getHop(hop.hopNumber)
        if (originalHop) {
          currentMtrData.hops.set(hop.hopNumber, originalHop)
        }
      }
      mainWindow?.webContents.send('hop-found', hop)
    })

    mtrService.on('hop-updated', async (hop: any) => {
      // Update hop in current data (as MtrHop instance)
      if (currentMtrData) {
        // Find the original MtrHop instance from MtrService
        const originalHop = mtrService?.getHop(hop.hopNumber)
        if (originalHop) {
          currentMtrData.hops.set(hop.hopNumber, originalHop)
        }
      }
      mainWindow?.webContents.send('hop-updated', hop)
    })

    mtrService.on('ping-result', (pingResult: any) => {
      // Ping result is now stored directly in the hops
      mainWindow?.webContents.send('ping-result', pingResult)
    })

    mtrService.on('progress', (progress: any) => {
      mainWindow?.webContents.send('mtr-progress', progress)
    })

    mtrService.on('mtr-complete', () => {
      mainWindow?.webContents.send('mtr-complete')
    })

    await mtrService.startMtr(mtrConfig)
    return { success: true }
  } catch (error) {
    console.error('MTR error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('stop-mtr', async () => {
  if (mtrService) {
    await mtrService.stopMtr()
    mtrService.cleanup()
    mtrService = null
  }
  return { success: true }
})

// IPC handlers for data queries
ipcMain.handle('get-hop-aggregated-data', async (event, hopNumber: number, interval: string) => {
  if (!currentMtrData) {
    return { success: false, error: 'Keine MTR-Daten verfügbar' }
  }

  const hop = currentMtrData.hops.get(hopNumber)
  if (!hop) {
    return { success: false, error: `Hop ${hopNumber} nicht gefunden` }
  }

  try {
    const aggregatedData = hop.getAggregatedData(interval)
    return { success: true, data: aggregatedData }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-hop-ping-history', async (event, hopNumber: number) => {
  if (!currentMtrData) {
    return { success: false, error: 'Keine MTR-Daten verfügbar' }
  }

  const hop = currentMtrData.hops.get(hopNumber)
  if (!hop) {
    return { success: false, error: `Hop ${hopNumber} nicht gefunden` }
  }

  try {
    const pingHistory = hop.getPingHistory()
    return { success: true, data: pingHistory }
  } catch (error) {
    return { success: false, error: error.message }
  }
})
