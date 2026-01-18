import { useState } from 'react';
import './Timer.css';

function Timer({ 
  timeRemaining, 
  isActive,
  timerState,
  mode, 
  onModeToggle, 
  onStart, 
  onStop,
  focusTime,
  breakTime,
  pomodoroCycles,
  currentCycle,
  sessionInfo,
  onFocusTimeChange,
  onBreakTimeChange,
  onCyclesChange
}) {
  const [showStopConfirm, setShowStopConfirm] = useState(false);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStopClick = () => {
    if (showStopConfirm) {
      onStop();
      setShowStopConfirm(false);
    } else {
      setShowStopConfirm(true);
      setTimeout(() => setShowStopConfirm(false), 3000);
    }
  };

  const focusPresets = [
    { label: '15 min', value: 15 * 60 },
    { label: '30 min', value: 30 * 60 },
    { label: '45 min', value: 45 * 60 },
    { label: '1 hr', value: 60 * 60 }
  ];

  const breakPresets = [
    { label: '5 min', value: 5 * 60 },
    { label: '15 min', value: 15 * 60 },
    { label: '30 min', value: 30 * 60 }
  ];

  const singleSessionPresets = [
    { label: '2 hours', value: 2 * 60 * 60 },
    { label: '4 hours', value: 4 * 60 * 60 }
  ];

  const cycleOptions = [
    { label: '1', value: 1 },
    { label: '2', value: 2 },
    { label: '3', value: 3 },
    { label: '4', value: 4 },
    { label: '5', value: 5 },
    { label: '6', value: 6 },
    { label: '7', value: 7 },
    { label: '8', value: 8 },
    { label: '9', value: 9 },
    { label: '10', value: 10 },
    { label: 'Infinite', value: 'infinite' }
  ];

  const getStateLabel = () => {
    switch (timerState) {
      case 'focus': return 'Focus';
      case 'break': return 'Break';
      default: return 'Off';
    }
  };

  const getStateColor = () => {
    switch (timerState) {
      case 'focus': return 'var(--color-green)';
      case 'break': return 'var(--color-blue)';
      default: return 'var(--color-secondary)';
    }
  };

  return (
    <div className="timer-container">
      <div className="timer-display">
        <div className="timer-label secondary-text">Time Remaining</div>
        <div className="timer-text">{formatTime(timeRemaining)}</div>
        <div className="timer-state-indicator" style={{ color: getStateColor() }}>
          {getStateLabel()}
        </div>
      </div>

      <div className="timer-controls">
        {isActive ? (
          <button 
            className={`timer-button stop-button ${showStopConfirm ? 'confirm' : ''}`}
            onClick={handleStopClick}
          >
            {showStopConfirm ? 'Click Again to Confirm' : 'Stop'}
          </button>
        ) : (
          <>
            <button className="timer-button start-button" onClick={onStart}>
              Start
            </button>
            <button className="timer-button mode-button" onClick={onModeToggle}>
              {mode === 'pomodoro' ? 'Single Session' : 'Pomodoro'}
              {mode === 'pomodoro' && <span className="swap-icon">⇄</span>}
            </button>
          </>
        )}
      </div>

      {!isActive && (
        <div className="timer-presets">
          {mode === 'pomodoro' ? (
            <>
              <div className="preset-group">
                <div className="preset-label secondary-text">Focus Time</div>
                <div className="preset-buttons">
                  {focusPresets.map(preset => (
                    <button
                      key={preset.value}
                      className={`preset-button ${focusTime === preset.value ? 'active' : ''}`}
                      onClick={() => onFocusTimeChange(preset.value)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="preset-group">
                <div className="preset-label secondary-text">Break Time</div>
                <div className="preset-buttons">
                  {breakPresets.map(preset => (
                    <button
                      key={preset.value}
                      className={`preset-button ${breakTime === preset.value ? 'active' : ''}`}
                      onClick={() => onBreakTimeChange(preset.value)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="preset-group">
                <div className="preset-label secondary-text">Cycles</div>
                <select
                  className="cycles-dropdown"
                  value={pomodoroCycles}
                  onChange={(e) => onCyclesChange(e.target.value === 'infinite' ? 'infinite' : parseInt(e.target.value))}
                >
                  {cycleOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div className="preset-group">
              <div className="preset-label secondary-text">Duration</div>
              <div className="preset-buttons">
                {singleSessionPresets.map(preset => (
                  <button
                    key={preset.value}
                    className={`preset-button ${focusTime === preset.value ? 'active' : ''}`}
                    onClick={() => onFocusTimeChange(preset.value)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {isActive && sessionInfo && (
        <div className="session-info">
          <div className="session-info-text secondary-text">{sessionInfo}</div>
          {mode === 'pomodoro' && (
            <div className="session-cycle-info secondary-text">
              Cycle {currentCycle}{pomodoroCycles !== 'infinite' ? ` / ${pomodoroCycles}` : ' (Infinite)'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Timer;
