// ============================================
// FocusSync Server - Educational Project
// ============================================
// SYLLABUS: CO4 - Server-side Web Application
// TOPIC 5 & 6: Node.js, Express, MongoDB
//
// This file demonstrates:
// - Express server setup (Topic 3)
// - API routes and middleware (Topic 4)
// - MongoDB integration (Topic 6)
// - Socket.io for real-time communication
// ============================================

// ============================================
// TOPIC 1: Node.js require() - Importing Modules
// ============================================
// require() is Node.js way to import modules (like import in ES6)
// - express: Web framework for creating API routes
// - http: Built-in Node module for creating HTTP server
// - socket.io: Library for real-time bidirectional communication
// - cors: Middleware to allow cross-origin requests
// - jsonwebtoken: For creating and verifying JWT tokens
// ============================================
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');

// Import our custom modules (files we created)
const connectDB = require('./config/db');      // Database connection
const Session = require('./models/Session');   // Session data model
const analyticsRoutes = require('./routes/analytics');  // Analytics API routes
const authRoutes = require('./routes/auth');   // Authentication routes

// ============================================
// TOPIC 1: Connect to MongoDB
// ============================================
connectDB();

// ============================================
// TOPIC 3: Express Server Setup
// ============================================
// express() creates our web application
const app = express();

// ============================================
// MIDDLEWARE - Request Processing Pipeline
// ============================================
// Middleware functions process requests before they reach routes
// Think of it as a "filter" that every request passes through

// CORS Middleware - Allows frontend from different ports to communicate
// Without this, browser would block requests from different origins
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  credentials: true
}));

// Body Parser Middleware - Parses JSON request bodies
// express.json() converts JSON data to JavaScript objects
// Without this, req.body would be undefined
app.use(express.json());

// ============================================
// TOPIC 4: API Routes - Defining Endpoints
// ============================================
// Routes map URLs to handlers
// Format: app.use('/path', router)

// Authentication routes (login, signup, etc.)
app.use('/api/auth', authRoutes);

// Analytics routes (sessions, leaderboard, insights)
app.use('/api', analyticsRoutes);

// ============================================
// HEALTH CHECK ENDPOINT
// ============================================
// Test endpoint to verify server is running
// Access: GET http://localhost:5000/api/health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'FocusSync server is running!' });
});

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================
// This catches any errors thrown in routes
// Must have 4 parameters: err, req, res, next
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ message: 'Server error!' });
});

// ============================================
// TOPIC 2: HTTP Server Setup
// ============================================
// http.createServer() wraps Express app in an HTTP server
// This is needed for Socket.io to work (it needs an HTTP server)
const server = http.createServer(app);

// ============================================
// TOPIC 3: Socket.io Setup (Real-time Communication)
// ============================================
// Socket.io enables real-time bidirectional communication
// Unlike HTTP where client requests and server responds,
// Socket.io maintains a persistent connection

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
    methods: ['GET', 'POST']
  }
});

// ============================================
// TOPIC 4: Socket Authentication Middleware
// ============================================
// Before allowing socket connection, verify JWT token
// This ensures only authenticated users can join rooms

const JWT_SECRET = 'focussync-secret-key';

io.use((socket, next) => {
  // Get token from handshake (initial connection)
  const token = socket.handshake.auth.token;
  
  // No token? Reject connection
  if (!token) {
    return next(new Error('Authentication required'));
  }
  
  // Verify token is valid
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;  // Attach user ID to socket
    next();  // Allow connection
  } catch (err) {
    next(new Error('Invalid token'));  // Reject connection
  }
});

// ============================================
// TOPIC 5: Real-time Event Handlers
// ============================================
// Events: connection, join_room, start_session, distraction, end_session, disconnect
// socket.on('event', callback) - Listen for events
// socket.emit('event', data) - Send to current client
// io.to(roomId).emit('event', data) - Broadcast to room

// In-memory storage for active study sessions
// Key: roomId, Value: session data
const activeSessions = {};

// ============================================
// CONNECTION EVENT - New client connected
// ============================================
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Track which rooms this socket is in
  socket.rooms = [];

  // ============================================
  // JOIN ROOM - User enters a study room
  // ============================================
  // socket.join(roomId) - Add socket to a "room" (group)
  // All sockets in a room receive messages broadcast to it
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    socket.rooms.push(roomId);
    
    // Initialize room data if first user
    if (!activeSessions[roomId]) {
      activeSessions[roomId] = {
        userCount: 0,
        distractionCount: 0,
        session: null,
        endTime: null
      };
    }
    
    // Increment user count for this room
    activeSessions[roomId].userCount += 1;
    
    // Broadcast updated count to ALL users in room
    io.to(roomId).emit('user_count', activeSessions[roomId].userCount);
    
    // If session already active, sync new user with current state
    if (activeSessions[roomId].session && activeSessions[roomId].endTime) {
      const remaining = Math.max(0, Math.floor((activeSessions[roomId].endTime - Date.now()) / 1000));
      socket.emit('session_sync', { remaining, distractionCount: activeSessions[roomId].distractionCount });
    }
  });

  // ============================================
  // START SESSION - Begin a new study timer
  // ============================================
  socket.on('start_session', async ({ roomId, duration }) => {
    try {
      // Calculate session timing
      const durationMs = duration * 60 * 1000;  // Convert minutes to milliseconds
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + durationMs);

      // Store session data in memory
      activeSessions[roomId] = {
        userCount: activeSessions[roomId]?.userCount || 1,
        distractionCount: 0,
        endTime: endTime.getTime(),
        session: { roomId, startTime, events: [{ type: 'start', time: startTime }] }
      };

      // Save session to MongoDB (persistent storage)
      const session = new Session({
        roomId,
        startTime,
        userId: socket.userId,
        events: [{ type: 'start', time: startTime }]
      });
      await session.save();
      activeSessions[roomId].sessionDoc = session;

      // Broadcast session start to ALL users in room
      io.to(roomId).emit('session_started', {
        startTime: startTime.getTime(),
        endTime: endTime.getTime(),
        duration
      });
      
      console.log(`Session started in room ${roomId}`);
    } catch (error) {
      console.error('Session start error:', error);
      socket.emit('error', { message: 'Failed to start session' });
    }
  });

  // ============================================
  // DISTRACTION - User got distracted during session
  // ============================================
  socket.on('distraction', async ({ roomId }) => {
    try {
      if (activeSessions[roomId] && activeSessions[roomId].sessionDoc) {
        // Increment distraction counter
        activeSessions[roomId].distractionCount += 1;
        
        // Record distraction event in database
        activeSessions[roomId].sessionDoc.events.push({
          type: 'distraction',
          time: new Date()
        });
        activeSessions[roomId].sessionDoc.distractions = activeSessions[roomId].distractionCount;
        await activeSessions[roomId].sessionDoc.save();
        
        // Broadcast updated count to room
        io.to(roomId).emit('distraction_count', activeSessions[roomId].distractionCount);
      }
    } catch (error) {
      console.error('Distraction error:', error);
    }
  });

  // ============================================
  // END SESSION - Stop the study timer
  // ============================================
  socket.on('end_session', async ({ roomId }) => {
    try {
      if (activeSessions[roomId] && activeSessions[roomId].sessionDoc) {
        const endTime = new Date();
        
        // Update session document with end time
        activeSessions[roomId].sessionDoc.endTime = endTime;
        activeSessions[roomId].sessionDoc.events.push({ type: 'end', time: endTime });
        
        // Calculate focus score: 100 - (distractions * 10)
        const distractions = activeSessions[roomId].sessionDoc.distractions || 0;
        activeSessions[roomId].sessionDoc.focusScore = Math.max(0, 100 - distractions * 10);
        await activeSessions[roomId].sessionDoc.save();
        
        // Clear active session from memory
        activeSessions[roomId].endTime = null;
        activeSessions[roomId].sessionDoc = null;
        activeSessions[roomId].session = null;
        activeSessions[roomId].distractionCount = 0;
        
        // Broadcast session ended to room
        io.to(roomId).emit('session_ended');
      }
    } catch (error) {
      console.error('End session error:', error);
    }
  });

  // ============================================
  // DISCONNECT - User closes browser/tab
  // ============================================
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Decrement user count in all rooms this socket was in
    if (socket.rooms) {
      socket.rooms.forEach(roomId => {
        if (activeSessions[roomId]) {
          activeSessions[roomId].userCount = Math.max(0, activeSessions[roomId].userCount - 1);
          io.to(roomId).emit('user_count', activeSessions[roomId].userCount);
        }
      });
    }
  });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`FocusSync server running on port ${PORT}`);
});
