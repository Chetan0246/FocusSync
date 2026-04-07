// Advanced Dashboard with Modern UI and Animations
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Dashboard() {
  const [sessions, setSessions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sessionsRes, leaderboardRes, heatmapRes] = await Promise.all([
        axios.get('http://localhost:5000/api/analytics/all'),
        axios.get('http://localhost:5000/api/leaderboard'),
        axios.get('http://localhost:5000/api/heatmap'),
      ]);
      setSessions(sessionsRes.data || []);
      setLeaderboard(leaderboardRes.data || []);
      setHeatmap(heatmapRes.data || []);
    } catch (error) {
      console.error('Error:', error);
      setSessions([]);
      setLeaderboard([]);
      setHeatmap([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    if (!sessions.length) {
      return { totalSessions: 0, totalFocusTime: 0, totalDistractions: 0, avgFocusScore: 0 };
    }

    let totalFocusTime = 0;
    let totalDistractions = 0;
    let totalFocusScore = 0;

    sessions.forEach((session) => {
      if (session.startTime && session.endTime) {
        totalFocusTime += (new Date(session.endTime) - new Date(session.startTime)) / 60000;
      }
      totalDistractions += session.distractions || 0;
      totalFocusScore += session.focusScore || 100;
    });

    return {
      totalSessions: sessions.length,
      totalFocusTime: Math.round(totalFocusTime),
      totalDistractions,
      avgFocusScore: Math.round(totalFocusScore / sessions.length),
    };
  };

  const getInsight = () => {
    const score = calculateStats().avgFocusScore;
    if (score >= 80) return { message: 'Excellent focus! Keep it up! 🌟', type: 'success' };
    if (score >= 60) return { message: 'Good focus. Try to minimize distractions. 👍', type: 'warning' };
    return { message: 'Focus needs improvement. Consider shorter sessions. 🎯', type: 'error' };
  };

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  const generateHeatmapData = () => {
    const days = [];
    const today = new Date();
    for (let i = 27; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayData = heatmap.find(h => h._id === dateStr);
      days.push({
        date: dateStr,
        day: date.getDate(),
        count: dayData?.sessionCount || 0,
        level: dayData ? Math.min(4, Math.ceil(dayData.sessionCount / 2)) : 0,
      });
    }
    return days;
  };

  const stats = calculateStats();
  const insight = getInsight();
  const heatmapData = generateHeatmapData();
  const latestSession = sessions[0] || null;

  if (loading) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '80px' }}>
          <div className="spinner spinner-lg" style={{ margin: '0 auto' }} />
          <p style={{ color: '#64748b', marginTop: '16px' }}>Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Page Title */}
      <h1 className="page-title">📊 Analytics Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-4">
        <StatCard value={stats.totalSessions} label="Total Sessions" icon="📚" delay={0.1} />
        <StatCard value={formatTime(stats.totalFocusTime * 60000)} label="Focus Time" icon="⏱️" delay={0.2} />
        <StatCard value={stats.totalDistractions} label="Distractions" icon="⚠️" delay={0.3} color="#f59e0b" />
        <StatCard value={stats.avgFocusScore} label="Avg Score" icon="🎯" delay={0.4} color={stats.avgFocusScore >= 70 ? '#22c55e' : '#f59e0b'} />
      </div>

      {/* Focus Score Analysis */}
      <div className="card" style={{ marginTop: '24px' }}>
        <h3 className="section-title">🎯 Focus Score Analysis</h3>
        <div className="grid grid-2" style={{ alignItems: 'center', marginTop: '24px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '120px',
              fontWeight: '900',
              background: 'linear-gradient(135deg, #22c55e 0%, #4ade80 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: '1',
            }}>
              {stats.avgFocusScore}
            </div>
            <p style={{ color: '#64748b', marginTop: '8px' }}>Average Focus Score</p>
          </div>
          <div style={{
            padding: '24px',
            borderRadius: '16px',
            background: insight.type === 'success' ? 'rgba(34, 197, 94, 0.1)' :
                        insight.type === 'warning' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            borderLeft: `4px solid ${insight.type === 'success' ? '#22c55e' : insight.type === 'warning' ? '#f59e0b' : '#ef4444'}`,
          }}>
            <h4 style={{ marginBottom: '12px', fontSize: '18px' }}>💡 Insight</h4>
            <p style={{ color: '#f8fafc', fontSize: '16px', lineHeight: '1.6' }}>{insight.message}</p>
          </div>
        </div>
      </div>

      {/* Session Timeline */}
      <div className="card" style={{ marginTop: '24px' }}>
        <h3 className="section-title">📜 Latest Session Timeline</h3>
        {latestSession ? (
          <div style={{ marginTop: '24px' }}>
            <div style={{
              padding: '24px',
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              borderRadius: '16px',
              marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <span className="room-id">{latestSession.roomId}</span>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <span style={{ color: '#22c55e' }}>Score: <strong>{latestSession.focusScore}</strong></span>
                  <span style={{ color: '#f59e0b' }}>Distractions: <strong>{latestSession.distractions || 0}</strong></span>
                </div>
              </div>
              <p style={{ color: '#64748b', marginTop: '12px', fontSize: '14px' }}>
                {new Date(latestSession.startTime).toLocaleString()}
              </p>
            </div>

            {/* Event Timeline */}
            <div className="timeline">
              {latestSession.events?.map((event, index) => (
                <div key={index} className="timeline-item">
                  <div className={`timeline-icon ${event.type}`}>
                    {event.type === 'start' ? '▶' : event.type === 'distraction' ? '⚠' : '■'}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', textTransform: 'capitalize' }}>{event.type}</div>
                    <div style={{ color: '#64748b', fontSize: '13px' }}>
                      {new Date(event.time).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <p className="empty-state-title">No sessions yet</p>
            <p className="empty-state-text">Start a study session to see your timeline!</p>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="card" style={{ marginTop: '24px' }}>
        <h3 className="section-title">🏆 Leaderboard</h3>
        {leaderboard.length > 0 ? (
          <div style={{ marginTop: '16px' }}>
            {leaderboard.map((item, index) => (
              <div key={index} className="leaderboard-item">
                <span className="leaderboard-rank">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </span>
                <span className="leaderboard-room">{item._id}</span>
                <div className="leaderboard-stats">
                  <span>⏱️ {formatTime(item.totalFocusTime)}</span>
                  <span>📊 {Math.round(item.avgFocusScore)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">🏆</div>
            <p className="empty-state-title">No data yet</p>
            <p className="empty-state-text">Complete sessions to appear on the leaderboard!</p>
          </div>
        )}
      </div>

      {/* Heatmap */}
      <div className="card" style={{ marginTop: '24px' }}>
        <h3 className="section-title">🗓️ Activity Heatmap (28 Days)</h3>
        <div className="heatmap">
          <div className="heatmap-legend">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map(level => (
              <div key={level} className={`heatmap-cell level-${level}`} style={{ width: '24px', height: '24px' }}>
                {level}
              </div>
            ))}
            <span>More</span>
          </div>
          <div className="heatmap-grid" style={{ marginTop: '16px' }}>
            {heatmapData.map((day, index) => (
              <div
                key={index}
                className={`heatmap-cell level-${day.level}`}
                title={`${day.date}: ${day.count} session${day.count !== 1 ? 's' : ''}`}
              >
                {day.day}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="card" style={{ marginTop: '24px' }}>
        <h3 className="section-title">📋 All Sessions</h3>
        {sessions.length > 0 ? (
          <div className="table-container" style={{ marginTop: '16px' }}>
            <table>
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Date</th>
                  <th>Duration</th>
                  <th>Distractions</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 10).map((session, index) => {
                  const duration = session.endTime && session.startTime
                    ? Math.round((new Date(session.endTime) - new Date(session.startTime)) / 60000)
                    : '-';
                  return (
                    <tr key={index}>
                      <td className="font-mono" style={{ color: '#22c55e' }}>{session.roomId}</td>
                      <td>{new Date(session.startTime).toLocaleDateString()}</td>
                      <td>{duration !== '-' ? `${duration}m` : '-'}</td>
                      <td style={{ color: '#f59e0b' }}>{session.distractions || 0}</td>
                      <td>
                        <span style={{
                          color: session.focusScore >= 70 ? '#22c55e' : '#f59e0b',
                          fontWeight: '700',
                          fontSize: '16px'
                        }}>
                          {session.focusScore || 100}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <p className="empty-state-title">No sessions recorded</p>
            <p className="empty-state-text">Join a room and start studying!</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ value, label, icon, delay, color = '#22c55e' }) {
  return (
    <div className="stat-card" style={{ animationDelay: `${delay}s` }}>
      <div className="stat-icon" style={{ fontSize: '32px', marginBottom: '12px' }}>{icon}</div>
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default Dashboard;
