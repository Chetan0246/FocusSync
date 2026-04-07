// Modern Glassmorphism Navigation Bar
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const publicLinks = [
    { path: '/login', label: 'Login', icon: '🔑' },
    { path: '/signup', label: 'Sign Up', icon: '✨' },
  ];

  const privateLinks = [
    { path: '/home', label: 'Home', icon: '⌂' },
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  ];

  const navLinks = user ? privateLinks : publicLinks;

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        padding: '16px 24px',
        background: scrolled 
          ? 'rgba(15, 23, 42, 0.8)' 
          : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled 
          ? '1px solid rgba(255, 255, 255, 0.05)' 
          : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {/* Logo */}
        <Link
          to="/"
          style={{
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)',
            }}
          >
            ⚡
          </div>
          <span
            style={{
              fontSize: '24px',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #22c55e 0%, #4ade80 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.5px',
            }}
          >
            FocusSync
          </span>
        </Link>

        {/* Navigation Links */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              style={{
                textDecoration: 'none',
                padding: '10px 20px',
                borderRadius: '10px',
                fontWeight: '600',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color:
                  location.pathname === link.path
                    ? '#22c55e'
                    : '#94a3b8',
                background:
                  location.pathname === link.path
                    ? 'rgba(34, 197, 94, 0.1)'
                    : 'transparent',
                border:
                  location.pathname === link.path
                    ? '1px solid rgba(34, 197, 94, 0.3)'
                    : '1px solid transparent',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (location.pathname !== link.path) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.color = '#f8fafc';
                }
              }}
              onMouseLeave={(e) => {
                if (location.pathname !== link.path) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#94a3b8';
                }
              }}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {user ? (
            <>
              <span style={{ color: '#94a3b8', fontSize: '14px' }}>
                {user.name || user.email}
              </span>
              <button
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '14px' }}
                onClick={logout}
              >
                <span>🚪</span>
                <span>Logout</span>
              </button>
            </>
          ) : (
            <button
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '14px' }}
              onClick={() => window.open('https://github.com', '_blank')}
            >
              <span>⭐</span>
              <span>Star</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
