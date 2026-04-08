import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';
import Timer from '../components/Timer';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { getAuthHeader } = useAuth();
  const socketRef = useRef(null);

  // Session state
  const [userCount, setUserCount] = useState(0);
  const [distractionCount, setDistractionCount] = useState(0);
  const [sessionActive, setSessionActive] = useState(false);
  const [endTime, setEndTime] = useState(null);
  const [duration, setDuration] = useState(25);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Real-time event stream
  const [events, setEvents] = useState([]);

  // Warning threshold (show warning after 3 distractions)
  const WARNING_THRESHOLD = 3;
  const [showWarning, setShowWarning] = useState(false);

  const wasVisible = useRef(true);

  // Socket connection and event handlers
  useEffect(() => {
    const token = localStorage.getItem('token');
    socketRef.current = io.connect('http://localhost:5000', { auth: { token } });
    const socket = socketRef.current;

    socket.on('connect', () => {
      socket.emit('join_room', roomId);
      addToast('Joined room successfully!', 'success');
      addEvent('user_joined', 'User joined the room');
    });

    socket.on('user_count', (count) => {
      setUserCount(count);
      if (count > 1) {
        addToast(`${count} users in room`, 'info');
        addEvent('user_joined', `${count} users now in room`);
      }
    });

    socket.on('distraction_count', (count) => {
      setDistractionCount(count);
      // Show warning if threshold exceeded
      if (count >= WARNING_THRESHOLD) {
        setShowWarning(true);
      }
    });

    socket.on('session_sync', (data) => {
      const newEndTime = Date.now() + data.remaining * 1000;
      setEndTime(newEndTime);
      setDistractionCount(data.distractionCount);
      setSessionActive(true);
      setEvents([]); // Clear events on sync
      addToast('Synced with active session!', 'success');
      addEvent('session_sync', 'Session synchronized');
    });

    socket.on('session_started', (data) => {
      setEndTime(data.endTime);
      setSessionActive(true);
      setEvents([]); // Clear previous events
      setShowWarning(false);
      addToast('Focus session started!', 'success');
      addEvent('session_started', `Session started: ${data.duration} min`);
    });

    socket.on('session_ended', () => {
      setSessionActive(false);
      setEndTime(null);
      setShowWarning(false);
      axios.get(`http://localhost:5000/api/analytics/${roomId}`, { headers: getAuthHeader() })
        .then(res => res.data?.sessions?.length && setSessionHistory(res.data.sessions.slice(0, 5)));
      const score = Math.max(0, 100 - distractionCount * 10);
      addEvent('session_ended', `Session ended - Score: ${score}`);
      addToast(`Session ended! Focus Score: ${score}`, score >= 70 ? 'success' : 'warning');
    });

    socket.on('error', (data) => {
      addToast(data.message || 'An error occurred', 'error');
      addEvent('error', data.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, addToast, getAuthHeader, distractionCount]);

  // Fetch session history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/analytics/${roomId}`, {
          headers: getAuthHeader()
        });
        if (res.data?.sessions?.length) {
          setSessionHistory(res.data.sessions.slice(0, 5));
        }
      } catch (error) {
        console.log('No previous sessions');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [roomId, getAuthHeader]);

  // Page visibility tracking for distractions
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      if (wasVisible.current && !isVisible && sessionActive && socketRef.current) {
        socketRef.current.emit('distraction', { roomId });
        addToast('Distraction: Tab switched!', 'warning');
        addEvent('distraction', 'User switched tabs');
      }
      wasVisible.current = isVisible;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [roomId, sessionActive, addToast]);

  // Add event to stream
  const addEvent = (type, message) => {
    const newEvent = {
      type,
      message,
      time: new Date().toLocaleTimeString(),
      id: Date.now(),
    };
    setEvents(prev => [newEvent, ...prev].slice(0, 20)); // Keep last 20 events
  };

  // Session controls
  const handleStartSession = () => {
    if (socketRef.current) {
      socketRef.current.emit('start_session', { roomId, duration });
    }
  };

  const handleEndSession = () => {
    if (socketRef.current) {
      socketRef.current.emit('end_session', { roomId });
    }
  };

  const handleSessionExpire = () => {
    setSessionActive(false);
    setEndTime(null);
    setShowWarning(false);
  };

  // Calculate current score and focus level
  const currentScore = Math.max(0, 100 - distractionCount * 10);
  const getFocusLevel = () => {
    if (currentScore >= 80) return { level: 'HIGH', color: '#22c55e', icon: '🌟' };
    if (currentScore >= 50) return { level: 'MEDIUM', color: '#f59e0b', icon: '👍' };
    return { level: 'LOW', color: '#ef4444', icon: '💪' };
  };
  const focusLevel = getFocusLevel();

  // Calculate efficiency
  const currentEfficiency = sessionActive ? Math.max(0, currentScore) : 0;

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="container">
      {/* Header */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ marginBottom: '8px', fontSize: '24px', fontWeight: '700' }}>Study Room</h2>
            <div className="room-id"><span style={{ color: '#64748b' }}>ID:</span> {roomId}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="user-count"><span>{userCount}</span><span style={{ fontSize: '14px' }}>Online</span></div>
            <button className="btn btn-secondary" onClick={() => navigate('/home')}>← Leave</button>
          </div>
        </div>
      </div>

      {/* Real-Time Warning Banner */}
      {showWarning && sessionActive && (
        <div style={{
          marginTop: '16px',
          padding: '16px 24px',
          background: 'rgba(239, 68, 68, 0.2)',
          border: '2px solid #ef4444',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          animation: 'shake 0.5s ease-in-out',
        }}>
          <span style={{ fontSize: '24px' }}>⚠️</span>
          <div>
            <strong style={{ color: '#ef4444' }}>Warning!</strong>
            <p style={{ color: '#f8fafc', margin: '4px 0 0', fontSize: '14px' }}>
              You've had {distractionCount} distractions. Consider taking a break!
            </p>
          </div>
          <button 
            onClick={() => setShowWarning(false)}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: '20px',
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Timer Card */}
      <div className="card card-glow" style={{ marginTop: '24px' }}>
        <h3 className="section-title text-center">
          {sessionActive ? '🎯 Focus Session Active' : '⏱️ Ready to Focus?'}
        </h3>

        <Timer endTime={endTime} onExpire={handleSessionExpire} />

        {/* Focus Level Badge */}
        {sessionActive && (
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <span style={{
              display: 'inline-block',
              padding: '8px 24px',
              background: focusLevel.color === '#22c55e' ? 'rgba(34, 197, 94, 0.2)' :
                         focusLevel.color === '#f59e0b' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              border: `2px solid ${focusLevel.color}`,
              borderRadius: '24px',
              color: focusLevel.color,
              fontWeight: '700',
              fontSize: '14px',
            }}>
              {focusLevel.icon} {focusLevel.level} FOCUS
            </span>
          </div>
        )}

        {/* Session Controls */}
        {!sessionActive ? (
          <div style={{ maxWidth: '300px', margin: '32px auto 0', textAlign: 'center' }}>
            <div className="form-group">
              <label className="form-label">Session Duration</label>
              <select className="input" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                <option value={15}>15 minutes</option>
                <option value={25}>25 minutes (Pomodoro)</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </div>
            <button className="btn btn-primary btn-lg" onClick={handleStartSession} style={{ width: '100%' }}>
              🚀 Start Session
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <button className="btn btn-secondary" onClick={handleEndSession}>End Session</button>
          </div>
        )}

        {/* Progress & Efficiency */}
        {sessionActive && (
          <div style={{ maxWidth: '400px', margin: '32px auto 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
              <span style={{ color: '#94a3b8' }}>Score & Efficiency</span>
              <span style={{ color: currentScore >= 70 ? '#22c55e' : '#f59e0b', fontWeight: '600' }}>{currentScore} ({currentEfficiency}%)</span>
            </div>
            <div className="progress progress-lg">
              <div className="progress-bar" style={{ width: `${currentScore}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Real-Time Event Stream */}
      <div className="card" style={{ marginTop: '24px' }}>
        <h3 className="section-title">📡 Live Event Stream</h3>
        <div style={{ marginTop: '16px', maxHeight: '200px', overflowY: 'auto' }}>
          {events.length > 0 ? (
            events.map((event, index) => (
              <div 
                key={event.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  background: '#1e293b',
                  borderRadius: '8px',
                  marginBottom: '6px',
                  borderLeft: `3px solid ${
                    event.type === 'session_started' || event.type === 'session_sync' ? '#22c55e' :
                    event.type === 'distraction' ? '#f59e0b' :
                    event.type === 'session_ended' ? '#3b82f6' : '#64748b'
                  }`,
                  animation: 'fadeIn 0.3s ease-out',
                }}
              >
                <span style={{ fontSize: '14px', color: '#64748b' }}>{event.time}</span>
                <span style={{ 
                  flex: 1, 
                  fontSize: '13px',
                  color: '#f8fafc',
                }}>
                  {event.message}
                </span>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
              <p>No events yet. Start a session to see live events!</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-2" style={{ marginTop: '24px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h4 style={{ color: '#64748b', marginBottom: '16px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>⚠️ Distractions</h4>
          <div style={{ fontSize: '72px', fontWeight: '800', color: '#f59e0b', lineHeight: '1' }}>{distractionCount}</div>
          <p style={{ color: '#94a3b8', marginTop: '12px', fontSize: '14px' }}>
            {distractionCount === 0 ? '🎉 Perfect focus!' : distractionCount >= WARNING_THRESHOLD ? '⚠️ Take a break!' : '📌 Stay focused'}
          </p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <h4 style={{ color: '#64748b', marginBottom: '16px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>📊 Focus Score</h4>
          <div style={{ fontSize: '72px', fontWeight: '800', color: currentScore >= 70 ? '#22c55e' : '#f59e0b', lineHeight: '1' }}>{currentScore}</div>
          <p style={{ color: '#94a3b8', marginTop: '12px', fontSize: '14px' }}>
            {currentScore >= 90 ? '🌟 Exceptional!' : currentScore >= 70 ? '👍 Good!' : '💪 Keep going!'}
          </p>
        </div>
      </div>

      {/* Session History */}
      <div className="card" style={{ marginTop: '24px' }}>
        <h3 className="section-title">📜 Recent Sessions</h3>
        {!loading && sessionHistory.length > 0 ? (
          <div style={{ marginTop: '16px' }}>
            {sessionHistory.map((session, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#1e293b', borderRadius: '12px', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontWeight: '600' }}>{formatDateTime(session.startTime)}</div>
                  <div style={{ color: '#64748b', fontSize: '13px' }}>
                    {session.endTime ? `${Math.round((new Date(session.endTime) - new Date(session.startTime)) / 60000)} min` : 'In progress'}
                  </div>
                </div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: session.focusScore >= 70 ? '#22c55e' : '#f59e0b' }}>{session.focusScore || 100}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state"><div className="empty-state-icon">📝</div><p className="empty-state-text">No previous sessions</p></div>
        )}
      </div>

      {/* Focus Tips */}
      <div className="card" style={{ marginTop: '24px' }}>
        <h3 className="section-title">💡 Focus Tips</h3>
        <div className="grid grid-2" style={{ marginTop: '16px', gap: '16px' }}>
          <div>
            <h4 style={{ color: '#22c55e', marginBottom: '12px', fontSize: '14px' }}>✅ DO</h4>
            <ul style={{ color: '#94a3b8', paddingLeft: '20px', lineHeight: '2', fontSize: '14px' }}>
              <li>Stay on this tab</li>
              <li>Close unnecessary tabs</li>
              <li>Find a quiet space</li>
            </ul>
          </div>
          <div>
            <h4 style={{ color: '#ef4444', marginBottom: '12px', fontSize: '14px' }}>❌ DON'T</h4>
            <ul style={{ color: '#94a3b8', paddingLeft: '20px', lineHeight: '2', fontSize: '14px' }}>
              <li>Switch tabs</li>
              <li>Check social media</li>
              <li>Minimize browser</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Room;
