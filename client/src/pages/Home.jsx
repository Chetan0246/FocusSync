// Modern Portfolio-Ready Home Page
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';

function Home() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [roomId, setRoomId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const generateRoomId = () => {
    return 'room-' + Math.random().toString(36).substring(2, 8);
  };

  const handleCreateRoom = () => {
    setIsCreating(true);
    const newRoomId = generateRoomId();
    setTimeout(() => {
      addToast('Creating new study room...', 'success');
      navigate(`/room/${newRoomId}`);
    }, 300);
  };

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      addToast('Joining room...', 'success');
      navigate(`/room/${roomId.trim()}`);
    }
  };

  return (
    <div className="container">
      {/* Hero Section */}
      <section className="card" style={{ 
        textAlign: 'center', 
        padding: '80px 40px',
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Animated Background Elements */}
        <div style={{
          position: 'absolute',
          top: '-100px',
          right: '-100px',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, transparent 70%)',
          animation: 'float 6s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-100px',
          left: '-100px',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
          animation: 'float 8s ease-in-out infinite reverse',
        }} />

        {/* Logo */}
        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'bounce 2s ease-in-out infinite',
        }}>
          ⚡
        </div>

        {/* Title */}
        <h1 className="page-title" style={{ 
          fontSize: '56px',
          marginBottom: '16px',
          position: 'relative',
        }}>
          FocusSync
        </h1>

        {/* Subtitle */}
        <p style={{ 
          color: '#94a3b8', 
          fontSize: '20px', 
          maxWidth: '600px',
          margin: '0 auto 48px',
          lineHeight: '1.8',
          position: 'relative',
        }}>
          Real-time collaborative study platform with synchronized timers,
          distraction tracking, and advanced analytics
        </p>

        {/* Action Buttons */}
        <div className="grid-2" style={{ 
          maxWidth: '500px', 
          margin: '0 auto',
          gap: '16px',
          position: 'relative',
        }}>
          <button
            className="btn btn-primary btn-lg"
            onClick={handleCreateRoom}
            disabled={isCreating}
            style={{ minWidth: '200px' }}
          >
            {isCreating ? (
              <span className="spinner spinner-sm" />
            ) : (
              <>
                <span>➕</span>
                <span>Create Room</span>
              </>
            )}
          </button>
          <button
            className="btn btn-secondary btn-lg"
            onClick={() => document.getElementById('join-section').scrollIntoView({ behavior: 'smooth' })}
          >
            <span>🔗</span>
            <span>Join Room</span>
          </button>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ marginTop: '48px' }}>
        <div className="grid grid-3">
          <FeatureCard
            icon="⏱️"
            title="Synchronized Timer"
            description="Server-authoritative timer synced across all users in real-time using WebSockets"
            delay={0.1}
          />
          <FeatureCard
            icon="🚫"
            title="Distraction Detection"
            description="Automatic tracking using Page Visibility API when users switch tabs"
            delay={0.2}
          />
          <FeatureCard
            icon="📊"
            title="Analytics Dashboard"
            description="Comprehensive insights with heatmaps, leaderboards, and session history"
            delay={0.3}
          />
        </div>
      </section>

      {/* How It Works - Technical Section */}
      <section className="card" style={{ marginTop: '48px' }}>
        <h3 className="section-title">🔧 Technical Architecture</h3>
        
        <div className="grid grid-3" style={{ marginTop: '24px', gap: '24px' }}>
          <TechCard
            number="01"
            title="WebSocket Communication"
            description="Real-time bidirectional events using Socket.io. No polling needed."
            code="socket.emit('event', data)"
          />
          <TechCard
            number="02"
            title="Server-Authoritative"
            description="Server stores endTime. Clients calculate remaining time locally."
            code="endTime - Date.now()"
          />
          <TechCard
            number="03"
            title="Browser APIs"
            description="Page Visibility API detects tab switches automatically."
            code="visibilityState"
          />
        </div>

        {/* Architecture Diagram */}
        <div style={{ marginTop: '32px' }}>
          <h4 style={{ color: '#64748b', marginBottom: '16px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            System Architecture
          </h4>
          <div style={{
            background: '#020617',
            borderRadius: '12px',
            padding: '24px',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: '#22c55e',
            overflow: 'auto',
            border: '1px solid #1e293b',
          }}>
            <pre style={{ margin: 0, lineHeight: '1.8' }}>
{`┌─────────────────────────────────────────────┐
│              BROWSER (React)                   │
│  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │  State   │◄─┤ Socket   │◄─┤ Visibility  │ │
│  │  (Hooks) │  │  Client  │  │    API      │ │
│  └──────────┘  └────┬─────┘  └─────────────┘ │
└──────────────────────┼───────────────────────┘
                       │ WebSocket
┌──────────────────────┼───────────────────────┐
│              SERVER (Node.js)                  │
│  ┌──────────┐  ┌─────┴─────┐  ┌────────────┐ │
│  │  Express │  │  Socket   │  │  MongoDB   │ │
│  │  REST    │  │  Server   │◄─┤  Mongoose  │ │
│  └──────────┘  └───────────┘  └────────────┘ │
└──────────────────────────────────────────────┘`}
            </pre>
          </div>
        </div>
      </section>

      {/* Join Section */}
      <section className="card" id="join-section" style={{ marginTop: '48px', maxWidth: '500px', margin: '48px auto 0' }}>
        <h3 className="section-title text-center">🔗 Join Existing Room</h3>
        
        <div style={{ marginTop: '24px' }}>
          <div className="form-group">
            <label className="form-label">Room ID</label>
            <input
              type="text"
              className="input"
              placeholder="Enter room ID (e.g., room-abc123)"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
              style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}
            />
          </div>
          <button
            className="btn btn-primary btn-lg"
            onClick={handleJoinRoom}
            disabled={!roomId.trim()}
            style={{ width: '100%', marginTop: '16px' }}
          >
            <span>🚪</span>
            <span>Join Room</span>
          </button>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="card" style={{ marginTop: '48px' }}>
        <h3 className="section-title">🛠️ Technologies Used</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '16px' }}>
          {['React', 'Node.js', 'Express', 'Socket.io', 'MongoDB', 'Mongoose', 'REST API', 'Page Visibility API'].map((tech) => (
            <span
              key={tech}
              className="badge badge-primary"
              style={{ padding: '8px 16px', fontSize: '14px' }}
            >
              {tech}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

// Feature Card Component
function FeatureCard({ icon, title, description, delay }) {
  return (
    <div className="card" style={{ animationDelay: `${delay}s` }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>{icon}</div>
      <h3 style={{ color: '#22c55e', marginBottom: '8px', fontSize: '18px' }}>{title}</h3>
      <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6' }}>{description}</p>
    </div>
  );
}

// Tech Card Component
function TechCard({ number, title, description, code }) {
  return (
    <div style={{
      padding: '24px',
      background: 'rgba(30, 41, 59, 0.5)',
      borderRadius: '12px',
      border: '1px solid #334155',
    }}>
      <div style={{
        fontSize: '48px',
        fontWeight: '800',
        color: 'rgba(34, 197, 94, 0.2)',
        marginBottom: '16px',
      }}>
        {number}
      </div>
      <h4 style={{ color: '#f8fafc', marginBottom: '8px', fontSize: '16px' }}>{title}</h4>
      <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: '1.6', marginBottom: '16px' }}>
        {description}
      </p>
      <code style={{
        display: 'block',
        padding: '8px 12px',
        background: '#0f172a',
        borderRadius: '6px',
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        color: '#22c55e',
      }}>
        {code}
      </code>
    </div>
  );
}

export default Home;
