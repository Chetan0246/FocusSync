require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const connectDB = require('./config/db');
const Session = require('./models/Session');
const analyticsRoutes = require('./routes/analytics');
const authRoutes = require('./routes/auth');
const config = require('./config/constants');

connectDB();

const app = express();

app.use(helmet());
app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(morgan(config.NODE_ENV === 'development' ? 'dev' : 'combined'));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many attempts, please try again later' },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many requests, please try again later' },
});

app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);
app.use('/api/auth', authRoutes);
app.use('/api', analyticsRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: config.CORS_ORIGIN, methods: ['GET', 'POST'] },
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Authentication error: Invalid token'));
  }
});

const activeSessions = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id, 'UserId:', socket.userId);
  socket.rooms = [];

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    socket.rooms.push(roomId);
    if (!activeSessions[roomId]) {
      activeSessions[roomId] = { userCount: 0, distractionCount: 0, session: null, endTime: null };
    }
    activeSessions[roomId].userCount += 1;
    io.to(roomId).emit('user_count', activeSessions[roomId].userCount);
    io.to(roomId).emit('distraction_count', activeSessions[roomId].distractionCount);
    if (activeSessions[roomId].session && activeSessions[roomId].endTime) {
      const remaining = Math.max(0, Math.floor((activeSessions[roomId].endTime - Date.now()) / 1000));
      socket.emit('session_sync', { remaining, distractionCount: activeSessions[roomId].distractionCount });
    }
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on('start_session', async ({ roomId, duration }) => {
    try {
      const durationMs = duration * 60 * 1000;
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + durationMs);

      activeSessions[roomId] = {
        ...activeSessions[roomId],
        endTime: endTime.getTime(),
        session: { roomId, startTime, events: [{ type: 'start', time: startTime }] },
        distractionCount: 0,
      };

      const session = new Session({
        roomId,
        startTime,
        userId: socket.userId,
        events: [{ type: 'start', time: startTime }],
      });
      await session.save();
      activeSessions[roomId].sessionDoc = session;

      io.to(roomId).emit('session_started', { startTime: startTime.getTime(), endTime: endTime.getTime(), duration });
      console.log(`Session started in room ${roomId} for ${duration} minutes`);
    } catch (error) {
      console.error('Session start error:', error);
      socket.emit('error', { message: 'Failed to start session' });
    }
  });

  socket.on('distraction', async ({ roomId }) => {
    try {
      if (activeSessions[roomId] && activeSessions[roomId].sessionDoc) {
        activeSessions[roomId].distractionCount += 1;
        const distractionTime = new Date();
        activeSessions[roomId].sessionDoc.events.push({ type: 'distraction', time: distractionTime });
        activeSessions[roomId].sessionDoc.distractions = activeSessions[roomId].distractionCount;
        await activeSessions[roomId].sessionDoc.save();
        io.to(roomId).emit('distraction_count', activeSessions[roomId].distractionCount);
      }
    } catch (error) {
      console.error('Distraction error:', error);
      socket.emit('error', { message: 'Failed to log distraction' });
    }
  });

  socket.on('end_session', async ({ roomId }) => {
    try {
      if (activeSessions[roomId] && activeSessions[roomId].sessionDoc) {
        const endTime = new Date();
        activeSessions[roomId].sessionDoc.endTime = endTime;
        activeSessions[roomId].sessionDoc.events.push({ type: 'end', time: endTime });
        const distractions = activeSessions[roomId].sessionDoc.distractions || 0;
        activeSessions[roomId].sessionDoc.focusScore = Math.max(0, 100 - distractions * 10);
        await activeSessions[roomId].sessionDoc.save();
        activeSessions[roomId].endTime = null;
        activeSessions[roomId].sessionDoc = null;
        activeSessions[roomId].session = null;
        activeSessions[roomId].distractionCount = 0;
        io.to(roomId).emit('session_ended');
      }
    } catch (error) {
      console.error('End session error:', error);
      socket.emit('error', { message: 'Failed to end session' });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
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

server.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);
});
