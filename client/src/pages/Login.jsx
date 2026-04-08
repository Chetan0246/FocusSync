import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import $ from 'jquery';

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { addToast } = useToast();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  useEffect(() => {
    $('.auth-submit').hover(
      function() { $(this).find('.btn-arrow').animate({ marginLeft: '8px' }, 200); },
      function() { $(this).find('.btn-arrow').animate({ marginLeft: '0px' }, 200); }
    );
  }, []);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    const result = await login(formData.email, formData.password);

    if (result.success) {
      addToast('Welcome back!', 'success');
      navigate('/home');
    } else {
      addToast(result.error || 'Login failed', 'error');
    }
    setIsLoading(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="auth-float-shape shape-1" />
        <div className="auth-float-shape shape-2" />
        <div className="auth-float-shape shape-3" />
        <div className="auth-grid-pattern" />
      </div>

      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <span className="logo-icon">⚡</span>
          </div>
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to continue your focus journey</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className={`form-group ${focusedField === 'email' || formData.email ? 'active' : ''} ${errors.email ? 'error' : ''}`}>
            <label className="form-label">
              <span className="label-icon">📧</span>
              Email Address
            </label>
            <div className="input-wrapper">
              <input
                type="email"
                name="email"
                className="input"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
              <span className="input-border-animation" />
            </div>
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className={`form-group ${focusedField === 'password' || formData.password ? 'active' : ''} ${errors.password ? 'error' : ''}`}>
            <label className="form-label">
              <span className="label-icon">🔒</span>
              Password
            </label>
            <div className="input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="input"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
              <span className="input-border-animation" />
            </div>
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          <div className="form-options">
            <label className="checkbox-wrapper">
              <input type="checkbox" />
              <span className="checkmark" />
              <span className="checkbox-label">Remember me</span>
            </label>
            <Link to="/forgot-password" className="forgot-link">Forgot password?</Link>
          </div>

          <button
            type="submit"
            className={`btn btn-primary btn-lg auth-submit ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner spinner-sm" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <span className="btn-arrow">→</span>
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <Link to="/signup" className="auth-link">Create one</Link>
          </p>
        </div>

        <div className="auth-divider">
          <span>or continue with</span>
        </div>

        <div className="social-buttons">
          <button className="social-btn" type="button">
            <span className="social-icon">🔵</span>
            <span>Google</span>
          </button>
          <button className="social-btn" type="button">
            <span className="social-icon">💻</span>
            <span>GitHub</span>
          </button>
        </div>
      </div>

      <div className="auth-features">
        <div className="auth-feature">
          <span className="feature-icon">⏱️</span>
          <span>Synchronized timers</span>
        </div>
        <div className="auth-feature">
          <span className="feature-icon">📊</span>
          <span>Track your progress</span>
        </div>
        <div className="auth-feature">
          <span className="feature-icon">🏆</span>
          <span>Compete with others</span>
        </div>
      </div>
    </div>
  );
}

export default Login;
