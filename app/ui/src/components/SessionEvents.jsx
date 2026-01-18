import { useState, useEffect } from 'react';
import './SessionEvents.css';

function SessionEvents({ sessions, currentSession, isSessionActive }) {
  const [selectedSessionId, setSelectedSessionId] = useState(
    isSessionActive ? 'current' : sessions.length > 0 ? sessions[0].id : null
  );

  // Update selected session when sessions change or session becomes active/inactive
  useEffect(() => {
    if (isSessionActive) {
      setSelectedSessionId('current');
    } else if (sessions.length > 0 && selectedSessionId === 'current') {
      setSelectedSessionId(sessions[0].id);
    }
  }, [isSessionActive, sessions.length]);

  const getEventEmoji = (reason) => {
    if (reason === 'doomscrolling') return '🚫';
    if (reason === 'sleeping') return '🛏️';
    return '⚠️';
  };

  const formatEventReason = (reason) => {
    if (reason === 'doomscrolling') return 'Doom Scrolling !!!';
    if (reason === 'sleeping') return 'Sleeping !!';
    return reason;
  };

  const getDisplaySession = () => {
    if (selectedSessionId === 'current' && currentSession) {
      return currentSession;
    }
    return sessions.find(s => s.id === selectedSessionId);
  };

  const displaySession = getDisplaySession();
  const events = displaySession?.events || [];

  const formatSessionTime = (session) => {
    if (!session) return '';
    const date = new Date(session.startTime);
    const options = { 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };
    return date.toLocaleString('en-US', options);
  };

  const formatSessionLabel = (session) => {
    if (!session) return '';
    const timeLabel = formatSessionTime(session);
    return session.name ? `${session.name} - ${timeLabel}` : `Session Events - ${timeLabel}`;
  };

  return (
    <div className="session-events-container">
      <div className="session-selector">
        <select
          className="session-selector-dropdown"
          value={selectedSessionId || ''}
          onChange={(e) => setSelectedSessionId(e.target.value)}
          disabled={isSessionActive}
        >
          {isSessionActive && currentSession && (
            <option value="current">
              {currentSession.name
                ? `${currentSession.name} - ${formatSessionTime(currentSession)}`
                : 'Session Events - Current'}
            </option>
          )}
          {sessions.map(session => (
            <option key={session.id} value={session.id}>
              {formatSessionLabel(session)}
            </option>
          ))}
          {sessions.length === 0 && !isSessionActive && (
            <option value="">No sessions available</option>
          )}
        </select>
      </div>

      <div className="session-events-table">
        <div className="events-header">
          <div className="events-header-cell">Reason</div>
          <div className="events-header-cell">Timestamp</div>
        </div>
        <div className="events-body">
          {events.length === 0 ? (
            <div className="events-empty">
              No events recorded for this session
            </div>
          ) : (
            events.map((event, index) => (
              <div key={index} className="events-row">
                <div className="events-cell reason-cell">
                  <span className="event-emoji">{getEventEmoji(event.reason)}</span>
                  <span className="event-reason">{formatEventReason(event.reason)}</span>
                </div>
                <div className="events-cell timestamp-cell">
                  {event.timestamp}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default SessionEvents;
