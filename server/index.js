require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const Session = require('./models/Session');
const analyticsRoutes = require('./routes/analytics');
const authRoutes = require('./routes/auth');

connectDB();

const app = express();

const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:3000', 'http://localhost:5000'];

app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api', limiter);

app.use('/api/auth', authRoutes);
app.use('/api', analyticsRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Create HTTP server and attach Socket.io to it
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000', // Allow frontend to connect
    methods: ['GET', 'POST'],
  },
});

// In-memory storage for active sessions
// Key: roomId, Value: { endTime, userCount, distractionCount, session }
const activeSessions = {};

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Handle user joining a study room
  socket.on('join_room', (roomId) => {
    // Add the socket to the room
    socket.join(roomId);

    // Initialize room data if it doesn't exist
    if (!activeSessions[roomId]) {
      activeSessions[roomId] = {
        userCount: 0,
        distractionCount: 0,
        session: null,
        endTime: null,
      };
    }

    // Increment user count for this room
    activeSessions[roomId].userCount += 1;

    // Send the updated user count and distraction count to everyone in the room
    io.to(roomId).emit('user_count', activeSessions[roomId].userCount);
    io.to(roomId).emit('distraction_count', activeSessions[roomId].distractionCount);

    // If there's an active session, sync the new user with remaining time
    if (activeSessions[roomId].session && activeSessions[roomId].endTime) {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((activeSessions[roomId].endTime - now) / 1000));

      // Tell the new user how much time is left
      socket.emit('session_sync', {
        remaining,
        distractionCount: activeSessions[roomId].distractionCount,
      });
    }

    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  // Handle starting a study session
  socket.on('start_session', async ({ roomId, duration }) => {
    // Duration is in minutes, convert to milliseconds
    const durationMs = duration * 60 * 1000;
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + durationMs);

    // Store the session end time in memory
    activeSessions[roomId] = {
      ...activeSessions[roomId],
      endTime: endTime.getTime(),
      session: {
        roomId,
        startTime,
        events: [{ type: 'start', time: startTime }],
      },
      distractionCount: 0,
    };

    // Create a new session document in MongoDB
    const session = new Session({
      roomId,
      startTime,
      events: [{ type: 'start', time: startTime }],
    });

    await session.save();

    // Store the MongoDB document reference
    activeSessions[roomId].sessionDoc = session;

    // Notify all users in the room that the session has started
    io.to(roomId).emit('session_started', {
      startTime: startTime.getTime(),
      endTime: endTime.getTime(),
      duration,
    });

    console.log(`Session started in room ${roomId} for ${duration} minutes`);
  });

  // Handle distraction events from users
  socket.on('distraction', async ({ roomId }) => {
    // Only count if there's an active session in this room
    if (activeSessions[roomId] && activeSessions[roomId].sessionDoc) {
      // Increment distraction count
      activeSessions[roomId].distractionCount += 1;

      // Add distraction event to the session
      const distractionTime = new Date();
      activeSessions[roomId].sessionDoc.events.push({
        type: 'distraction',
        time: distractionTime,
      });
      activeSessions[roomId].sessionDoc.distractions = activeSessions[roomId].distractionCount;

      // Save the updated session to MongoDB
      await activeSessions[roomId].sessionDoc.save();

      // Broadcast the updated distraction count to all users in the room
      io.to(roomId).emit('distraction_count', activeSessions[roomId].distractionCount);
    }
  });

  // Handle session end
  socket.on('end_session', async ({ roomId }) => {
    if (activeSessions[roomId] && activeSessions[roomId].sessionDoc) {
      const endTime = new Date();

      // Update the session document
      activeSessions[roomId].sessionDoc.endTime = endTime;
      activeSessions[roomId].sessionDoc.events.push({
        type: 'end',
        time: endTime,
      });

      // Calculate focus score: 100 - (distractions * 10), minimum 0
      const distractions = activeSessions[roomId].sessionDoc.distractions || 0;
      activeSessions[roomId].sessionDoc.focusScore = Math.max(0, 100 - distractions * 10);

      await activeSessions[roomId].sessionDoc.save();

      // Clear the active session data
      activeSessions[roomId].endTime = null;
      activeSessions[roomId].sessionDoc = null;
      activeSessions[roomId].session = null;
      activeSessions[roomId].distractionCount = 0;

      // Notify all users in the room
      io.to(roomId).emit('session_ended');
    }
  });

  // Handle user disconnecting
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    // Find the room this user was in and decrement the count
    // Note: In a production app, we'd track which room each socket is in
    // For simplicity, we rely on the room data being updated on join
  });
});

// Start the server on port 5000
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
