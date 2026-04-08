// FocusSync - Main App Component
// ============================================
// SYLLABUS: CO5 - Component-based Frontend Library
// 
// This file demonstrates:
// - React functional components
// - useState and useEffect hooks
// - React Router for navigation
// - Context API for state management
// ============================================

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ToastProvider from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Room from './pages/Room';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

// ============================================
// MAIN APP COMPONENT
// Topic: React Functional Components
// ============================================
function App() {
  return (
    // ErrorBoundary catches React errors
    <ErrorBoundary>
      {/* AuthProvider wraps entire app for authentication state */}
      <AuthProvider>
        {/* ToastProvider enables toast notifications */}
        <ToastProvider>
          {/* Router enables client-side navigation */}
          <Router>
            <div className="App">
              {/* Animated background effects */}
              <div className="background-effects">
                <div className="grid-pattern" />
                <div className="bg-gradient bg-gradient-1" />
                <div className="bg-gradient bg-gradient-2" />
                <div className="bg-gradient bg-gradient-3" />
              </div>

              {/* Route configuration */}
              <AppRoutes />
            </div>
          </Router>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

// ============================================
// ROUTE CONFIGURATION
// Topic: React Router
// ============================================
function AppRoutes() {
  // Get current user from AuthContext
  const { user } = React.useContext(require('./context/AuthContext').AuthContext || {});

  return (
    <>
      {/* Navigation bar - always visible */}
      <Navbar />
      
      {/* Main content area */}
      <main>
        {/* Route definitions */}
        <Routes>
          {/* Public routes - accessible when NOT logged in */}
          <Route 
            path="/login" 
            element={user ? <Navigate to="/home" /> : <Login />} 
          />
          <Route 
            path="/signup" 
            element={user ? <Navigate to="/home" /> : <Signup />} 
          />
          
          {/* Protected routes - require authentication */}
          <Route 
            path="/home" 
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/room/:roomId" 
            element={
              <ProtectedRoute>
                <Room />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Default route - redirects based on auth status */}
          <Route 
            path="/" 
            element={<Navigate to={user ? '/home' : '/login'} />} 
          />
        </Routes>
      </main>
    </>
  );
}

export default App;
