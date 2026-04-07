// Advanced Room Page with Modern UI
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';
import Timer from '../components/Timer';
import { useToast } from '../components/Toast';

const socket = io.connect('http://localhost:5000');

function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [userCount, setUserCount] = useState(0);
  const [distractionCount, setDistractionCount] = useState(0);
  const [sessionActive, setSessionActive] = useState(false);
  const [endTime, setEndTime] = useState(null);
  const [duration, setDuration] = useState(25);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const wasVisible = useRef(true);

  // Fetch session history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/analytics/${roomId}`);
        if (res.data?.length) {
          setSessionHistory(res.data.slice(0, 5));
        }
      } catch (error) {
        console.log('No previous sessions');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [roomId]);

  // Join room
  useEffect(() => {
    socket.emit('join_room', roomId);
    addToast('Joined room successfully!', 'success');

    return () => {
      socket.emit('leave_room', roomId);
    };
  }, [roomId, addToast]);

  // Socket events
  useEffect(() => {
    socket.on('user_count', (count) => {
      setUserCount(count);
      if (count > 1) addToast(`${count} users in room`, 'info');
    });

    socket.on('distraction_count', (count) => {
      setDistractionCount(count);
    });

    socket.on('session_sync', (data) => {
      const newEndTime = Date.now() + data.remaining * 1000;
      setEndTime(newEndTime);
      setDistractionCount(data.distractionCount);
      setSessionActive(true);
      addToast('Synced with active session!', 'success');
    });

    socket.on('session_started', (data) => {
      setEndTime(data.endTime);
      setSessionActive(true);
      addToast('Focus session started!', 'success');
    });

    socket.on('session_ended', () => {
      setSessionActive(false);
      setEndTime(null);
      fetch(`http://localhost:5000/api/analytics/${roomId}`)
        .then(res => res.json())
        .then(data => data.length && setSessionHistory(data.slice(0, 5)));
      const score = Math.max(0, 100 - distractionCount * 10);
      addToast(`Session ended! Focus Score: ${score}`, score >= 70 ? 'success' : 'warning');
    });

    return () => {
      socket.off('user_count');
      socket.off('distraction_count');
      socket.off('session_sync');
      socket.off('session_started');
      socket.off('session_ended');
    };
  }, [addToast, distractionCount, roomId]);

  // Page Visibility API
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      if (wasVisible.current && !isVisible && sessionActive) {
        socket.emit('distraction', { roomId });
        addToast('Distraction: Tab switched!', 'warning');
      }
      wasVisible.current = isVisible;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [roomId, sessionActive, addToast]);

  const handleStartSession = () => {
    socket.emit('start_session', { roomId, duration });
  };

  const handleEndSession = () => {
    socket.emit('end_session', { roomId });
  };

  const handleSessionExpire = () => {
    setSessionActive(false);
    setEndTime(null);
  };

  const currentScore = Math.max(0, 100 - distractionCount * 10);
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
            <h2 style={{ marginBottom: '8px', fontSize: '24px', fontWeight: '700' }}>
              Study Room
            </h2>
            <div className="room-id">
              <span style={{ color: '#64748b' }}>ID:</span> {roomId}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="user-count">
              <span>{userCount}</span>
              <span style={{ fontSize: '14px' }}>Online</span>
            </div>
            <button className="btn btn-secondary" onClick={() => navigate('/')}>
              ← Leave
            </button>
          </div>
        </div>
      </div>

      {/* Timer Card */}
      <div className="card card-glow" style={{ marginTop: '24px' }}>
        <h3 className="section-title text-center">
          {sessionActive ? '🎯 Focus Session Active' : '⏱️ Ready to Focus?'}
        </h3>

        <Timer endTime={endTime} onExpire={handleSessionExpire} />

        {/* Session Controls */}
        {!sessionActive ? (
          <div style={{ maxWidth: '300px', margin: '32px auto 0', textAlign: 'center' }}>
            <div className="form-group">
              <label className="form-label">Session Duration</label>
              <select
                className="input"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              >
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
            <button className="btn btn-secondary" onClick={handleEndSession}>
              End Session
            </button>
          </div>
        )}

        {/* Progress */}
        {sessionActive && (
          <div style={{ maxWidth: '400px', margin: '32px auto 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
              <span style={{ color: '#94a3b8' }}>Current Score</span>
              <span style={{ color: currentScore >= 70 ? '#22c55e' : '#f59e0b', fontWeight: '600' }}>
                {currentScore}
              </span>
            </div>
            <div className="progress progress-lg">
              <div className="progress-bar" style={{ width: `${currentScore}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-2" style={{ marginTop: '24px' }}>
        {/* Distraction Counter */}
        <div className="card" style={{ textAlign: 'center' }}>
          <h4 style={{ color: '#64748b', marginBottom: '16px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            ⚠️ Distractions
          </h4>
          <div style={{ fontSize: '72px', fontWeight: '800', color: '#f59e0b', lineHeight: '1' }}>
            {distractionCount}
          </div>
          <p style={{ color: '#94a3b8', marginTop: '12px', fontSize: '14px' }}>
            {distractionCount === 0 ? '🎉 Perfect focus!' : '📌 Stay on this tab'}
          </p>
        </div>

        {/* Focus Score */}
        <div className="card" style={{ textAlign: 'center' }}>
          <h4 style={{ color: '#64748b', marginBottom: '16px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            📊 Focus Score
          </h4>
          <div style={{ fontSize: '72px', fontWeight: '800', color: currentScore >= 70 ? '#22c55e' : '#f59e0b', lineHeight: '1' }}>
            {currentScore}
          </div>
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
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px',
                  background: '#1e293b',
                  borderRadius: '12px',
                  marginBottom: '8px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#334155'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#1e293b'}
              >
                <div>
                  <div style={{ fontWeight: '600' }}>{formatDateTime(session.startTime)}</div>
                  <div style={{ color: '#64748b', fontSize: '13px' }}>
                    {session.endTime ? `${Math.round((new Date(session.endTime) - new Date(session.startTime)) / 60000)} min` : 'In progress'}
                  </div>
                </div>
                <div style={{ 
                  fontSize: '24px', 
                  fontWeight: '700',
                  color: session.focusScore >= 70 ? '#22c55e' : '#f59e0b'
                }}>
                  {session.focusScore || 100}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <p className="empty-state-text">No previous sessions</p>
          </div>
        )}
      </div>

      {/* Tips */}
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
