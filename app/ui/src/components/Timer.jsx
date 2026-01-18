import { useState } from 'react';
import './Timer.css';

function Timer({ 
  timeRemaining, 
  isActive, 
  mode, 
  onModeToggle, 
  onStart, 
  onStop,
  focusTime,
  breakTime,
  onFocusTimeChange,
  onBreakTimeChange
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

  return (
    <div className="timer-container">
      <div className="timer-display">
        <div className="timer-label secondary-text">Time Remaining</div>
        <div className="timer-text">{formatTime(timeRemaining)}</div>
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
              {mode === 'pomodoro' ? 'Custom' : 'Pomodoro'}
              {mode === 'pomodoro' && <span className="swap-icon">⇄</span>}
            </button>
          </>
        )}
      </div>

      {!isActive && (
        <div className="timer-presets">
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
          {mode === 'pomodoro' && (
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
          )}
        </div>
      )}
    </div>
  );
}

export default Timer;
