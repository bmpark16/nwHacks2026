const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const sessionStorage = require('./storage/sessionStorage');
const settingsStorage = require('./storage/settingsStorage');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow = null;
let pythonProcess = null;
let pythonPort = 5001;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      // Allow camera and microphone access
      webSecurity: true
    }
  });

  mainWindow = win;

  // Load the app
  if (isDev) {
    // In development, load from Vite dev server
    win.loadURL('http://localhost:5173');
    // DevTools can be opened manually with F12 or Ctrl+Shift+I
  } else {
    // In production, load from built files
    win.loadFile(path.join(__dirname, '../ui/dist/index.html'));
  }
}

// IPC Handlers
ipcMain.handle('camera:list', async () => {
  // Camera enumeration is handled in renderer process
  return [];
});

ipcMain.handle('session:get-logs', async () => {
  return sessionStorage.loadSessions();
});

ipcMain.handle('session:save', async (event, session) => {
  return sessionStorage.saveSession(session);
});

ipcMain.handle('session:log-event', async (event, sessionId, eventData) => {
  return sessionStorage.addEventToSession(sessionId, eventData);
});

ipcMain.handle('settings:get', async (event, key) => {
  return settingsStorage.getSetting(key);
});

ipcMain.handle('settings:set', async (event, key, value) => {
  return settingsStorage.setSetting(key, value);
});

ipcMain.handle('python:start', async () => {
  if (pythonProcess) {
    return { success: true, message: 'Python process already running' };
  }

  try {
    const pythonPath = path.join(__dirname, '../python/bridge_service.py');

    // Use the venv Python directly
    const venvPython = path.join(__dirname, '../../.venv/bin/python3');
    let pythonCmd = venvPython;

    // Check if venv Python exists, otherwise fall back to system python
    const fs = require('fs');
    if (!fs.existsSync(venvPython)) {
      console.warn('Venv Python not found, falling back to system python3');
      pythonCmd = 'python3';
    }

    console.log(`Using Python: ${pythonCmd}`);

    pythonProcess = spawn(pythonCmd, [pythonPath], {
      cwd: path.join(__dirname, '../python'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONUNBUFFERED: '1' }  // Disable Python output buffering
    });

    pythonProcess.stdout.on('data', (data) => {
      console.log(`Python: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python Error: ${data}`);
    });

    pythonProcess.on('close', (code) => {
      console.log(`Python process exited with code ${code}`);
      pythonProcess = null;
    });

    pythonProcess.on('error', (error) => {
      console.error('Failed to start Python process:', error);
      pythonProcess = null;
    });

    // Wait a bit for the server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if process is still running
    if (pythonProcess && pythonProcess.pid) {
      return { success: true, port: pythonPort };
    } else {
      return { success: false, error: 'Python process failed to start' };
    }
  } catch (error) {
    console.error('Error starting Python process:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('python:stop', async () => {
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
    return { success: true };
  }
  return { success: true, message: 'No Python process running' };
});

ipcMain.handle('python:send-frame', async (event, frameData) => {
  if (!pythonProcess) {
    console.log('Frame rejected: Python process not running');
    return { success: false, error: 'Python process not running' };
  }

  try {
    const https = require('http');
    const options = {
      hostname: '127.0.0.1',  // Use IPv4 directly instead of 'localhost'
      port: pythonPort,
      path: '/process_frame',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5000
    };

    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            resolve(result);
          } catch (e) {
            console.error('Invalid JSON response from Python:', data);
            resolve({ success: false, error: 'Invalid response from Python' });
          }
        });
      });

      req.on('error', (error) => {
        console.error('Request error:', error.message);
        resolve({ success: false, error: error.message });
      });

      req.on('timeout', () => {
        console.error('Request timeout');
        req.destroy();
        resolve({ success: false, error: 'Request timeout' });
      });

      req.write(JSON.stringify({ frame: frameData }));
      req.end();
    });
  } catch (error) {
    console.error('Error sending frame to Python:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('arduino:trigger', async (event, action) => {
  try {
    const https = require('http');
    const options = {
      hostname: '127.0.0.1',  // Use IPv4 directly instead of 'localhost'
      port: pythonPort,
      path: '/trigger_arduino',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            resolve(result);
          } catch (e) {
            resolve({ success: false, error: 'Invalid response from Python' });
          }
        });
      });

      req.on('error', (error) => {
        resolve({ success: false, error: error.message });
      });

      req.write(JSON.stringify({ action }));
      req.end();
    });
  } catch (error) {
    console.error('Error triggering Arduino:', error);
    return { success: false, error: error.message };
  }
});

// Notification handler
ipcMain.handle('notification:show', async (event, title, body) => {
  // Check if notification permission is granted
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: title || 'Wet Reminder',
      body: body,
      silent: false
    });
    notification.show();
    return { success: true };
  }
  return { success: false, error: 'Notifications not supported' };
});

// Cleanup on app quit
app.on('before-quit', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
});

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
