import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ToastProvider from './components/Toast';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Room from './pages/Room';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <div className="App">
            <div className="background-effects">
              <div className="grid-pattern" />
              <div className="bg-gradient bg-gradient-1" />
              <div className="bg-gradient bg-gradient-2" />
              <div className="bg-gradient bg-gradient-3" />
            </div>

            <Navbar />

            <main>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/room/:roomId" element={<Room />} />
                <Route path="/dashboard" element={<Dashboard />} />
              </Routes>
            </main>
          </div>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
