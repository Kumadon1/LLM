const { app, BrowserWindow, Menu, Tray, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = process.env.NODE_ENV !== 'production';

let mainWindow;
let pythonProcess;
let tray;

// Backend configuration
const BACKEND_PORT = 8000;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;

// Start Python backend
function startPythonBackend() {
  const pythonExecutable = isDev 
    ? path.join(__dirname, '..', 'backend', '.venv', 'bin', 'python')
    : path.join(process.resourcesPath, 'backend', 'python', 'bin', 'python');
  
  const backendScript = isDev
    ? path.join(__dirname, '..', 'backend', 'app.py')
    : path.join(process.resourcesPath, 'backend', 'app.py');

  // Use the SAME database as development - single source of truth!
  const projectRoot = path.join(__dirname, '..');
  pythonProcess = spawn(pythonExecutable, [backendScript], {
    env: {
      ...process.env,
      PYTHONUNBUFFERED: '1',
      PORT: BACKEND_PORT,
      DATABASE_PATH: path.join(projectRoot, 'backend', 'james_llm.db'),
      MODELS_PATH: path.join(projectRoot, 'backend', 'models'),
      CACHE_PATH: path.join(projectRoot, 'backend', 'cache')
    }
  });

  pythonProcess.stdout.on('data', (data) => {
    console.log(`Backend: ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`Backend Error: ${data}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
    if (code !== 0 && mainWindow) {
      mainWindow.webContents.send('backend-error', 'Backend process crashed');
    }
  });

  // Wait for backend to be ready
  return waitForBackend();
}

// Wait for backend to be ready
async function waitForBackend(retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(`${BACKEND_URL}/health`);
      if (response.ok) {
        console.log('Backend is ready');
        return true;
      }
    } catch (e) {
      // Backend not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('Backend failed to start');
}

// Create the application window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 700,
    title: 'James LLM 1',
    // icon: path.join(__dirname, 'assets', 'icon.png'), // Uncomment when icon is available
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allow loading local files
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    frame: process.platform !== 'darwin',
  });

  // Load the app
  // Always load from built files for simplicity
  const indexPath = path.join(__dirname, '..', 'frontend', 'dist', 'index.html');
  console.log('Loading from:', indexPath);
  mainWindow.loadFile(indexPath);

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.send('menu-new-project')
        },
        {
          label: 'Open Project',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow.webContents.send('menu-open-project')
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow.webContents.send('menu-save')
        },
        { type: 'separator' },
        {
          label: 'Import Corpus',
          click: () => mainWindow.webContents.send('menu-import-corpus')
        },
        {
          label: 'Export Results',
          click: () => mainWindow.webContents.send('menu-export-results')
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Toggle DevTools', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Actual Size', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'Toggle Fullscreen', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Models',
      submenu: [
        {
          label: 'Download Model',
          click: () => mainWindow.webContents.send('menu-download-model')
        },
        {
          label: 'Load Model',
          click: () => mainWindow.webContents.send('menu-load-model')
        },
        {
          label: 'Model Manager',
          click: () => mainWindow.webContents.send('menu-model-manager')
        },
        { type: 'separator' },
        {
          label: 'Fine-tune Model',
          click: () => mainWindow.webContents.send('menu-finetune-model')
        }
      ]
    },
    {
      label: 'Tools',
      submenu: [
        {
          label: 'Batch Processing',
          click: () => mainWindow.webContents.send('menu-batch-processing')
        },
        {
          label: 'Experiment Tracker',
          click: () => mainWindow.webContents.send('menu-experiment-tracker')
        },
        {
          label: 'Performance Monitor',
          click: () => mainWindow.webContents.send('menu-performance-monitor')
        },
        { type: 'separator' },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow.webContents.send('menu-settings')
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://docs.jamesllm1.ai')
        },
        {
          label: 'Tutorial',
          click: () => mainWindow.webContents.send('menu-tutorial')
        },
        { type: 'separator' },
        {
          label: 'About James LLM 1',
          click: () => mainWindow.webContents.send('menu-about')
        }
      ]
    }
  ];

  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { label: 'About ' + app.getName(), role: 'about' },
        { type: 'separator' },
        { label: 'Services', role: 'services', submenu: [] },
        { type: 'separator' },
        { label: 'Hide ' + app.getName(), accelerator: 'Command+H', role: 'hide' },
        { label: 'Hide Others', accelerator: 'Command+Shift+H', role: 'hideothers' },
        { label: 'Show All', role: 'unhide' },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'Command+Q', click: () => app.quit() }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Create system tray
function createTray() {
  // Skip tray if icon doesn't exist
  const trayIconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  const fs = require('fs');
  if (!fs.existsSync(trayIconPath)) {
    console.log('Tray icon not found, skipping tray creation');
    return;
  }
  tray = new Tray(trayIconPath);
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show App', click: () => mainWindow.show() },
    { label: 'Generate Text', click: () => mainWindow.webContents.send('tray-generate') },
    { type: 'separator' },
    { label: 'GPU Status: Active', enabled: false },
    { label: 'Models Loaded: 2', enabled: false },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);
  
  tray.setToolTip('James LLM 1 - Ready');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

// IPC handlers
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result.filePaths[0];
});

ipcMain.handle('select-file', async (event, filters) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: filters || [{ name: 'All Files', extensions: ['*'] }]
  });
  return result.filePaths[0];
});

ipcMain.handle('save-file', async (event, defaultPath, filters) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath,
    filters: filters || [{ name: 'All Files', extensions: ['*'] }]
  });
  return result.filePath;
});

ipcMain.handle('get-backend-url', () => BACKEND_URL);

// App event handlers
app.whenReady().then(async () => {
  try {
    console.log('Starting backend...');
    await startPythonBackend();
    console.log('Creating window...');
    createWindow();
    createMenu();
    createTray();
  } catch (error) {
    console.error('Failed to start application:', error);
    dialog.showErrorBox('Startup Error', `Failed to start application: ${error.message}`);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  dialog.showErrorBox('Unexpected Error', error.message);
});
