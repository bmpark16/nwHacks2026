import { useState, useEffect, useRef } from 'react';
import Timer from './components/Timer';
import CameraSelector from './components/CameraSelector';
import CameraPreview from './components/CameraPreview';
import SessionEvents from './components/SessionEvents';
import './App.css';

function App() {
  const [mode, setMode] = useState('pomodoro'); // 'pomodoro' or 'manual'
  const [isActive, setIsActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [focusTime, setFocusTime] = useState(30 * 60); // 30 minutes default
  const [breakTime, setBreakTime] = useState(5 * 60); // 5 minutes default
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [showCameraSelector, setShowCameraSelector] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [sessionEvents, setSessionEvents] = useState([]);
  const [pythonStarted, setPythonStarted] = useState(false);
  const [probabilityThreshold, setProbabilityThreshold] = useState(0.8);
  const lastEventTimeRef = useRef({});

  // Load sessions and settings on mount
  useEffect(() => {
    loadSessions();
    loadSettings();
  }, []);

  // Start Python bridge on mount
  useEffect(() => {
    if (window.electronAPI) {
      startPythonBridge();
    }
    return () => {
      if (window.electronAPI && pythonStarted) {
        window.electronAPI.stopPython();
      }
    };
  }, []);

  const handleTimerComplete = async () => {
    if (mode === 'pomodoro') {
      // For now, just end the session. Break mode can be added later
      await handleStop();
    } else {
      await handleStop();
    }
  };

  // Timer countdown effect
  useEffect(() => {
    let interval = null;
    if (isActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (!isActive && interval) {
      clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeRemaining, mode]);

  const loadSessions = async () => {
    if (window.electronAPI) {
      try {
        const loadedSessions = await window.electronAPI.getSessions();
        setSessions(loadedSessions);
      } catch (error) {
        console.error('Error loading sessions:', error);
      }
    }
  };

  const loadSettings = async () => {
    if (window.electronAPI) {
      try {
        const threshold = await window.electronAPI.getSetting('probabilityThreshold');
        if (threshold) setProbabilityThreshold(threshold);
        const cameraId = await window.electronAPI.getSetting('lastSelectedCamera');
        if (cameraId) setSelectedCameraId(cameraId);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  };

  const startPythonBridge = async () => {
    if (window.electronAPI && !pythonStarted) {
      try {
        const result = await window.electronAPI.startPython();
        if (result && result.success) {
          setPythonStarted(true);
          console.log('Python bridge started');
          return true;
        } else {
          console.error('Failed to start Python bridge:', result?.error);
          return false;
        }
      } catch (error) {
        console.error('Error starting Python bridge:', error);
        return false;
      }
    }
    return pythonStarted;
  };

  const handleModeToggle = () => {
    if (!isActive) {
      setMode(prev => prev === 'pomodoro' ? 'manual' : 'pomodoro');
    }
  };

  const handleStart = async () => {
    if (!selectedCameraId) {
      setShowCameraSelector(true);
      return;
    }

    // Ensure Python bridge is running
    if (!pythonStarted && window.electronAPI) {
      const result = await startPythonBridge();
      if (!result) {
        alert('Failed to start Python bridge. Please check if Python dependencies are installed.');
        return;
      }
    }

    const newSession = {
      id: `session-${Date.now()}`,
      startTime: new Date().toISOString(),
      mode: mode,
      focusDuration: focusTime,
      breakDuration: breakTime,
      events: []
    };

    setCurrentSession(newSession);
    setIsActive(true);
    setTimeRemaining(focusTime);
    setSessionEvents([]);
    lastEventTimeRef.current = {};

    // Save session to storage
    if (window.electronAPI) {
      try {
        await window.electronAPI.saveSession(newSession);
      } catch (error) {
        console.error('Error saving session:', error);
      }
    }
  };

  const handleStop = async () => {
    if (currentSession) {
      const completedSession = {
        ...currentSession,
        endTime: new Date().toISOString(),
        events: sessionEvents
      };
      
      // Save to storage
      if (window.electronAPI) {
        await window.electronAPI.saveSession(completedSession);
      }
      
      setSessions(prev => [completedSession, ...prev]);
      setCurrentSession(null);
    }
    setIsActive(false);
    setTimeRemaining(0);
    setSessionEvents([]);
    lastEventTimeRef.current = {};
    
    // Reload sessions to get updated list
    await loadSessions();
  };


  const handleCameraSelect = async (cameraId) => {
    setSelectedCameraId(cameraId);
    setShowCameraSelector(false);
    
    // Save to settings
    if (window.electronAPI) {
      await window.electronAPI.setSetting('lastSelectedCamera', cameraId);
    }
  };

  const handleFrameCapture = async (frameData) => {
    if (!isActive || !pythonStarted || !window.electronAPI || !currentSession) return;

    try {
      const result = await window.electronAPI.sendFrame(frameData);
      
      if (result && result.success && result.detected) {
        const action = result.action;
        const now = Date.now();
        
        // Throttle events - only log if same action hasn't been logged in last 5 seconds
        const lastTime = lastEventTimeRef.current[action] || 0;
        if (now - lastTime > 5000) {
          lastEventTimeRef.current[action] = now;
          await handleEventDetected({
            reason: action,
            confidence: result.confidence
          });
        }
      }
    } catch (error) {
      // Silently handle errors to avoid console spam
      // Only log if it's a significant error
      if (error.message && !error.message.includes('fetch')) {
        console.error('Error processing frame:', error);
      }
    }
  };

  const handleEventDetected = async (event) => {
    const timestamp = formatTimeFromStart(currentSession?.startTime);
    const newEvent = {
      ...event,
      timestamp
    };
    
    setSessionEvents(prev => [...prev, newEvent]);
    
    if (currentSession) {
      const updatedSession = {
        ...currentSession,
        events: [...currentSession.events, newEvent]
      };
      setCurrentSession(updatedSession);
      
      // Save event to storage
      if (window.electronAPI) {
        await window.electronAPI.logEvent(currentSession.id, newEvent);
        await window.electronAPI.saveSession(updatedSession);
      }
    }
  };

  const formatTimeFromStart = (startTime) => {
    if (!startTime) return '00:00';
    const start = new Date(startTime);
    const now = new Date();
    const diff = Math.floor((now - start) / 1000);
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1 className="app-title">
          Wet Reminder
          <span className="app-icon">💧</span>
        </h1>
      </header>

      <main className="App-main">
        <div className="App-left-panel">
          <Timer
            timeRemaining={timeRemaining}
            isActive={isActive}
            mode={mode}
            onModeToggle={handleModeToggle}
            onStart={handleStart}
            onStop={handleStop}
            focusTime={focusTime}
            breakTime={breakTime}
            onFocusTimeChange={setFocusTime}
            onBreakTimeChange={setBreakTime}
          />

          {!isActive && (
            <button
              className="choose-camera-button"
              onClick={() => setShowCameraSelector(true)}
            >
              Choose Camera
            </button>
          )}

          {isActive && (
            <>
              <CameraPreview
                isActive={isActive}
                cameraId={selectedCameraId}
                onFrameCapture={handleFrameCapture}
              />
              {!pythonStarted && (
                <div className="python-warning secondary-text" style={{ textAlign: 'center', padding: '8px' }}>
                  Python bridge not running - events will not be detected
                </div>
              )}
            </>
          )}
        </div>

        <div className="App-right-panel">
          <SessionEvents
            sessions={sessions}
            currentSession={currentSession}
            isSessionActive={isActive}
          />
        </div>
      </main>

      <CameraSelector
        isOpen={showCameraSelector}
        onClose={() => setShowCameraSelector(false)}
        onSelect={handleCameraSelect}
        selectedCameraId={selectedCameraId}
      />
    </div>
  );
}

export default App;
