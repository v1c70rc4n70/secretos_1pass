const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('v4lt3sVault', {
  load: () => ipcRenderer.invoke('vault:load'),
  save: (value) => ipcRenderer.invoke('vault:save', value),
  location: () => ipcRenderer.invoke('vault:location')
});
