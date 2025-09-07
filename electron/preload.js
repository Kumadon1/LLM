const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File system operations
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  selectFile: (filters) => ipcRenderer.invoke('select-file', filters),
  saveFile: (defaultPath, filters) => ipcRenderer.invoke('save-file', defaultPath, filters),
  
  // Backend communication
  getBackendUrl: () => ipcRenderer.invoke('get-backend-url'),
  
  // Menu events
  onMenuAction: (callback) => {
    const events = [
      'menu-new-project',
      'menu-open-project',
      'menu-save',
      'menu-import-corpus',
      'menu-export-results',
      'menu-download-model',
      'menu-load-model',
      'menu-model-manager',
      'menu-finetune-model',
      'menu-batch-processing',
      'menu-experiment-tracker',
      'menu-performance-monitor',
      'menu-settings',
      'menu-tutorial',
      'menu-about',
      'tray-generate'
    ];
    
    events.forEach(event => {
      ipcRenderer.on(event, (_, ...args) => callback(event, ...args));
    });
  },
  
  // Backend status
  onBackendError: (callback) => ipcRenderer.on('backend-error', (_, error) => callback(error)),
  
  // System info
  platform: process.platform,
  arch: process.arch,
  versions: {
    node: process.versions.node,
    electron: process.versions.electron,
    chrome: process.versions.chrome
  }
});
