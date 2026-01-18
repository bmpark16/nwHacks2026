const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Camera
  listCameras: () => ipcRenderer.invoke('camera:list'),

  // Sessions
  getSessions: () => ipcRenderer.invoke('session:get-logs'),
  saveSession: (session) => ipcRenderer.invoke('session:save', session),
  logEvent: (sessionId, event) => ipcRenderer.invoke('session:log-event', sessionId, event),

  // Settings
  getSetting: (key) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),

  // Python Bridge
  startPython: () => ipcRenderer.invoke('python:start'),
  stopPython: () => ipcRenderer.invoke('python:stop'),
  sendFrame: (frameData) => ipcRenderer.invoke('python:send-frame', frameData),

  // Arduino
  triggerArduino: (action) => ipcRenderer.invoke('arduino:trigger', action),

  // Notifications
  showNotification: (title, body) => ipcRenderer.invoke('notification:show', title, body),
});
