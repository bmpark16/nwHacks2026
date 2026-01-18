const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const getStoragePath = () => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'settings.json');
};

const defaultSettings = {
  defaultFocusTime: 30 * 60, // 30 minutes in seconds
  defaultBreakTime: 5 * 60, // 5 minutes in seconds
  probabilityThreshold: 0.8,
  arduinoPort: null,
  lastSelectedCamera: null
};

const ensureStorageFile = () => {
  const storagePath = getStoragePath();
  if (!fs.existsSync(storagePath)) {
    fs.writeFileSync(storagePath, JSON.stringify(defaultSettings, null, 2));
  }
};

const loadSettings = () => {
  try {
    ensureStorageFile();
    const storagePath = getStoragePath();
    const data = fs.readFileSync(storagePath, 'utf8');
    const parsed = JSON.parse(data);
    return { ...defaultSettings, ...parsed };
  } catch (error) {
    console.error('Error loading settings:', error);
    return defaultSettings;
  }
};

const saveSettings = (settings) => {
  try {
    ensureStorageFile();
    const storagePath = getStoragePath();
    const currentSettings = loadSettings();
    const updatedSettings = { ...currentSettings, ...settings };
    fs.writeFileSync(storagePath, JSON.stringify(updatedSettings, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
};

const getSetting = (key) => {
  const settings = loadSettings();
  return settings[key];
};

const setSetting = (key, value) => {
  return saveSettings({ [key]: value });
};

module.exports = {
  loadSettings,
  saveSettings,
  getSetting,
  setSetting
};
