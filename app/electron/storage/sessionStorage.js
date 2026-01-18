const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const getStoragePath = () => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'sessions.json');
};

const ensureStorageFile = () => {
  const storagePath = getStoragePath();
  if (!fs.existsSync(storagePath)) {
    fs.writeFileSync(storagePath, JSON.stringify({ sessions: [] }, null, 2));
  }
};

const loadSessions = () => {
  try {
    ensureStorageFile();
    const storagePath = getStoragePath();
    const data = fs.readFileSync(storagePath, 'utf8');
    const parsed = JSON.parse(data);
    return parsed.sessions || [];
  } catch (error) {
    console.error('Error loading sessions:', error);
    return [];
  }
};

const saveSessions = (sessions) => {
  try {
    ensureStorageFile();
    const storagePath = getStoragePath();
    fs.writeFileSync(storagePath, JSON.stringify({ sessions }, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving sessions:', error);
    return false;
  }
};

const saveSession = (session) => {
  const sessions = loadSessions();
  const existingIndex = sessions.findIndex(s => s.id === session.id);

  if (existingIndex >= 0) {
    sessions[existingIndex] = session;
  } else {
    sessions.push(session);
  }

  // Sort by start time, most recent first
  sessions.sort((a, b) => {
    return new Date(b.startTime) - new Date(a.startTime);
  });

  return saveSessions(sessions);
};

const getSessionById = (sessionId) => {
  const sessions = loadSessions();
  return sessions.find(s => s.id === sessionId) || null;
};

const addEventToSession = (sessionId, event) => {
  const sessions = loadSessions();
  const session = sessions.find(s => s.id === sessionId);

  if (session) {
    if (!session.events) {
      session.events = [];
    }
    session.events.push(event);
    return saveSessions(sessions);
  }

  return false;
};

module.exports = {
  loadSessions,
  saveSession,
  getSessionById,
  addEventToSession
};
