import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const { addToast } = useToast();
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const getPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    return strength;
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
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
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    const result = await signup(formData.name, formData.email, formData.password);

    if (result.success) {
      addToast('Account created successfully!', 'success');
      navigate('/home');
    } else {
      addToast(result.error || 'Signup failed', 'error');
    }
    setIsLoading(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
    if (name === 'password') {
      setPasswordStrength(getPasswordStrength(value));
    }
  };

  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
  const strengthColors = ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#10b981'];

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="auth-float-shape shape-1" />
        <div className="auth-float-shape shape-2" />
        <div className="auth-float-shape shape-3" />
        <div className="auth-grid-pattern" />
      </div>

      <div className="auth-card signup-card">
        <div className="auth-header">
          <div className="auth-logo">
            <span className="logo-icon">⚡</span>
          </div>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Start your focused study session today</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className={`form-group ${focusedField === 'name' || formData.name ? 'active' : ''} ${errors.name ? 'error' : ''}`}>
            <label className="form-label">
              <span className="label-icon">👤</span>
              Full Name
            </label>
            <div className="input-wrapper">
              <input
                type="text"
                name="name"
                className="input"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
              />
              <span className="input-border-animation" />
            </div>
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

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
                placeholder="Create a strong password"
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
            {formData.password && (
              <div className="password-strength">
                <div className="strength-bars">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`strength-bar ${i < passwordStrength ? 'active' : ''}`}
                      style={{ backgroundColor: i < passwordStrength ? strengthColors[passwordStrength - 1] : undefined }}
                    />
                  ))}
                </div>
                <span className="strength-label" style={{ color: strengthColors[passwordStrength - 1] || '#64748b' }}>
                  {passwordStrength > 0 ? strengthLabels[passwordStrength - 1] : ''}
                </span>
              </div>
            )}
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          <div className={`form-group ${focusedField === 'confirmPassword' || formData.confirmPassword ? 'active' : ''} ${errors.confirmPassword ? 'error' : ''}`}>
            <label className="form-label">
              <span className="label-icon">🔐</span>
              Confirm Password
            </label>
            <div className="input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                className="input"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                onFocus={() => setFocusedField('confirmPassword')}
                onBlur={() => setFocusedField(null)}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
              <span className="input-border-animation" />
            </div>
            {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
          </div>

          <div className="form-options terms">
            <label className="checkbox-wrapper">
              <input type="checkbox" required />
              <span className="checkmark" />
              <span className="checkbox-label">
                I agree to the <Link to="/terms" className="terms-link">Terms</Link> and <Link to="/privacy" className="terms-link">Privacy Policy</Link>
              </span>
            </label>
          </div>

          <button
            type="submit"
            className={`btn btn-primary btn-lg auth-submit ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner spinner-sm" />
                <span>Creating account...</span>
              </>
            ) : (
              <>
                <span>Create Account</span>
                <span className="btn-arrow">→</span>
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">Sign in</Link>
          </p>
        </div>

        <div className="auth-divider">
          <span>or sign up with</span>
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

export default Signup;
