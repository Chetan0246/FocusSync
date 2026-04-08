import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function Dashboard() {
  const { getAuthHeader } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeader();
      const [sessionsRes, leaderboardRes, heatmapRes, insightsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/analytics/all', { headers }),
        axios.get('http://localhost:5000/api/leaderboard'),
        axios.get('http://localhost:5000/api/heatmap'),
        axios.get('http://localhost:5000/api/insights', { headers }),
      ]);
      setSessions(sessionsRes.data?.sessions || sessionsRes.data || []);
      setLeaderboard(leaderboardRes.data || []);
      setHeatmap(heatmapRes.data || []);
      setInsights(insightsRes.data || null);
    } catch (error) {
      console.error('Error:', error);
      setSessions([]);
      setLeaderboard([]);
      setHeatmap([]);
      setInsights(null);
    } finally {
      setLoading(false);
    }
  };

  // Classify focus level based on score
  const getFocusLevel = (score) => {
    if (score >= 80) return { level: 'HIGH', color: '#22c55e', icon: '🌟', bg: 'rgba(34, 197, 94, 0.15)' };
    if (score >= 50) return { level: 'MEDIUM', color: '#f59e0b', icon: '👍', bg: 'rgba(245, 158, 11, 0.15)' };
    return { level: 'LOW', color: '#ef4444', icon: '💪', bg: 'rgba(239, 68, 68, 0.15)' };
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

  // Calculate session efficiency
  const calculateEfficiency = (session) => {
    if (!session.startTime || !session.endTime) return 100;
    const totalTime = (new Date(session.endTime) - new Date(session.startTime)) / 60000;
    if (totalTime <= 0) return 100;
    const distractions = session.distractions || 0;
    // Efficiency = totalTime without distractions / totalTime
    const efficiency = Math.max(0, Math.round(100 - (distractions * 10)));
    return efficiency;
  };

  const getInsight = () => {
    const score = calculateStats().avgFocusScore;
    if (score >= 80) return { message: 'Excellent focus! Keep it up! 🌟', type: 'success' };
    if (score >= 60) return { message: 'Good focus. Try to minimize distractions. 👍', type: 'warning' };
    return { message: 'Focus needs improvement. Consider shorter sessions. 🎯', type: 'error' };
  };

  // Get behavioral insight message
  const getBehavioralInsight = () => {
    if (!insights || !insights.avgTimeBetweenDistractions) {
      return { message: 'Complete sessions to see your patterns!', type: 'info' };
    }
    const minutes = insights.avgTimeBetweenDistractions;
    if (minutes >= 15) {
      return { message: `Great! You stay focused for ${minutes} min average. 🌟`, type: 'success' };
    }
    if (minutes >= 5) {
      return { message: `You get distracted every ${minutes} min. Try 25-min sessions! 👍`, type: 'warning' };
    }
    return { message: `You get distracted quickly (every ${minutes} min). Start with 15-min sessions! 🎯`, type: 'error' };
  };

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  const formatMs = (ms) => {
    if (!ms) return '0m';
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
  const behavioralInsight = getBehavioralInsight();
  const focusLevel = getFocusLevel(stats.avgFocusScore);
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
      <h1 className="page-title">📊 Analytics Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-4">
        <StatCard value={stats.totalSessions} label="Total Sessions" icon="📚" delay={0.1} />
        <StatCard value={formatTime(stats.totalFocusTime * 60000)} label="Focus Time" icon="⏱️" delay={0.2} />
        <StatCard value={stats.totalDistractions} label="Distractions" icon="⚠️" color="#f59e0b" delay={0.3} />
        <StatCard value={stats.avgFocusScore} label="Avg Score" icon="🎯" color={stats.avgFocusScore >= 70 ? '#22c55e' : '#f59e0b'} delay={0.4} />
      </div>

      {/* Focus Level Section */}
      <div className="card" style={{ marginTop: '24px' }}>
        <h3 className="section-title">🎯 Focus Classification</h3>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '32px',
          background: focusLevel.bg,
          borderRadius: '16px',
          marginTop: '16px',
          border: `2px solid ${focusLevel.color}`,
        }}>
          <span style={{ fontSize: '64px', marginRight: '24px' }}>{focusLevel.icon}</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ 
              fontSize: '48px', 
              fontWeight: '800', 
              color: focusLevel.color,
              lineHeight: '1',
            }}>
              {focusLevel.level}
            </div>
            <p style={{ color: '#94a3b8', marginTop: '8px' }}>
              Based on average focus score of {stats.avgFocusScore}
            </p>
          </div>
        </div>
        <div style={{ marginTop: '16px', padding: '16px', background: '#1e293b', borderRadius: '12px' }}>
          <p style={{ color: '#f8fafc', fontSize: '14px', lineHeight: '1.6' }}>
            <strong>How it works:</strong> HIGH (80+), MEDIUM (50-79), LOW (&lt;50) based on focus score
          </p>
        </div>
      </div>

      {/* Behavioral Insights Section */}
      <div className="card" style={{ marginTop: '24px' }}>
        <h3 className="section-title">🧠 Behavioral Insights</h3>
        <div style={{ marginTop: '16px' }}>
          {/* Insight Message */}
          <div style={{
            padding: '24px',
            borderRadius: '12px',
            background: behavioralInsight.type === 'success' ? 'rgba(34, 197, 94, 0.1)' :
                        behavioralInsight.type === 'warning' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            borderLeft: `4px solid ${behavioralInsight.type === 'success' ? '#22c55e' : 
                                    behavioralInsight.type === 'warning' ? '#f59e0b' : '#ef4444'}`,
            marginBottom: '24px',
          }}>
            <h4 style={{ marginBottom: '8px' }}>💡 Insight</h4>
            <p style={{ color: '#f8fafc', fontSize: '16px' }}>{behavioralInsight.message}</p>
          </div>

          {/* Insights Stats */}
          <div className="grid grid-3" style={{ gap: '16px' }}>
            <div style={{ 
              padding: '20px', 
              background: '#1e293b', 
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏱️</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#22c55e' }}>
                {insights?.avgTimeBetweenDistractions || '-'}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>
                {insights?.avgTimeBetweenDistractions ? 'Min Between Distractions' : 'No Data'}
              </div>
            </div>
            <div style={{ 
              padding: '20px', 
              background: '#1e293b', 
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6' }}>
                {insights?.efficiency || 100}%
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>Overall Efficiency</div>
            </div>
            <div style={{ 
              padding: '20px', 
              background: '#1e293b', 
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎯</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#8b5cf6' }}>
                {formatMs(insights?.totalFocusTime)}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>Total Focus Time</div>
            </div>
          </div>
        </div>
      </div>

      {/* Efficiency Section */}
      <div className="card" style={{ marginTop: '24px' }}>
        <h3 className="section-title">⚡ Session Efficiency</h3>
        <p style={{ color: '#94a3b8', marginTop: '8px', marginBottom: '16px' }}>
          Efficiency = Focus Time without distractions / Total Time × 100%
        </p>
        {latestSession ? (
          <div style={{ padding: '24px', background: '#1e293b', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ color: '#f8fafc' }}>Latest Session Efficiency</span>
              <span style={{ 
                fontSize: '32px', 
                fontWeight: '700', 
                color: calculateEfficiency(latestSession) >= 70 ? '#22c55e' : '#f59e0b' 
              }}>
                {calculateEfficiency(latestSession)}%
              </span>
            </div>
            <div className="progress progress-lg">
              <div 
                className="progress-bar" 
                style={{ 
                  width: `${calculateEfficiency(latestSession)}%`,
                  background: calculateEfficiency(latestSession) >= 70 ? 
                    'linear-gradient(90deg, #22c55e 0%, #4ade80 100%)' : 
                    'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)'
                }} 
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '13px', color: '#64748b' }}>
              <span>Time: {latestSession.endTime && latestSession.startTime ? Math.round((new Date(latestSession.endTime) - new Date(latestSession.startTime)) / 60000) : 0}m</span>
              <span>Distractions: {latestSession.distractions || 0}</span>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">⚡</div>
            <p className="empty-state-text">Complete a session to see efficiency</p>
          </div>
        )}
      </div>

      {/* Event Log Section */}
      <div className="card" style={{ marginTop: '24px' }}>
        <h3 className="section-title">📜 Recent Events</h3>
        {latestSession && latestSession.events ? (
          <div style={{ marginTop: '16px', maxHeight: '300px', overflowY: 'auto' }}>
            {[...latestSession.events].reverse().map((event, index) => (
              <div 
                key={index} 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  background: '#1e293b',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  borderLeft: `3px solid ${
                    event.type === 'start' ? '#22c55e' : 
                    event.type === 'distraction' ? '#f59e0b' : '#ef4444'
                  }`,
                }}
              >
                <span style={{ fontSize: '20px' }}>
                  {event.type === 'start' ? '▶' : event.type === 'distraction' ? '⚠️' : '■'}
                </span>
                <span style={{ 
                  textTransform: 'capitalize', 
                  fontWeight: '600',
                  color: event.type === 'start' ? '#22c55e' : 
                         event.type === 'distraction' ? '#f59e0b' : '#ef4444',
                }}>
                  {event.type}
                </span>
                <span style={{ color: '#64748b', fontSize: '13px', marginLeft: 'auto' }}>
                  {new Date(event.time).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📜</div>
            <p className="empty-state-text">No events recorded yet</p>
          </div>
        )}
      </div>

      {/* Focus Score Analysis */}
      <div className="card" style={{ marginTop: '24px' }}>
        <h3 className="section-title">🎯 Focus Analysis</h3>
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
            <h4 style={{ marginBottom: '12px', fontSize: '18px' }}>💡 Tip</h4>
            <p style={{ color: '#f8fafc', fontSize: '16px', lineHeight: '1.6' }}>{insight.message}</p>
          </div>
        </div>
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
            <p className="empty-state-text">Complete sessions to appear on leaderboard!</p>
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
    </div>
  );
}

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
