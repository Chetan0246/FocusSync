// Advanced Timer Component with Modern UI
import React, { useState, useEffect } from 'react';

function Timer({ endTime, onExpire }) {
  const [remaining, setRemaining] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!endTime) {
      setRemaining(0);
      setIsActive(false);
      return;
    }

    setIsActive(true);

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((endTime - now) / 1000));
      setRemaining(diff);

      if (diff === 0) {
        setIsActive(false);
        if (onExpire) onExpire();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [endTime, onExpire]);

  // Format seconds to MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const getProgress = () => {
    if (!isActive || remaining === 0) return 0;
    return Math.min(100, (remaining / 60) * 100);
  };

  // Get timer state class
  const getTimerState = () => {
    if (!isActive) return '';
    if (remaining < 60) return 'danger';
    if (remaining < 180) return 'warning';
    return 'active';
  };

  // If no active timer
  if (!isActive) {
    return (
      <div className="timer-section">
        <div className="timer-container">
          <div className="timer-display" style={{ color: '#4b5563' }}>
            00:00
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="timer-section">
      {/* Progress Ring Background */}
      <div className="timer-container">
        <div className={`timer-ring ${getTimerState()}`} />
        
        {/* Timer Display */}
        <div className={`timer-display ${getTimerState()}`}>
          {formatTime(remaining)}
        </div>

        {/* Pulsing effect when active */}
        {isActive && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              background: 'rgba(34, 197, 94, 0.1)',
              animation: 'pulse 2s ease-in-out infinite',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {/* Additional info */}
      <div style={{ marginTop: '24px', color: '#64748b', fontSize: '14px' }}>
        {remaining > 0 ? (
          <>
            <span style={{ color: '#22c55e', fontWeight: '600' }}>
              {remaining}
            </span>{' '}
            seconds remaining
          </>
        ) : (
          'Session complete!'
        )}
      </div>
    </div>
  );
}

export default Timer;
