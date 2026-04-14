/* ============================================================
   FocusSync - Server Entry Point (server/index.js)
   FIXED ISSUES:
   - Issue 1:  Track participants by EMAIL (not name) to avoid duplicates
   - Issue 2:  Tab-switch distraction no longer fires a spurious leave event
   - Issue 3:  Only the session CREATOR can end the session
   - Issue 4a: actualDurationSecs:0 falsy bug fixed (stored as null until set)
   - Issue 4b: Score saved after distractions are fully recorded
   - Issue 4c: calculateFocusScore conflict resolved (single source of truth)
   - Issue 4d: leave event no longer auto-fires 11 ms after distraction
   - Issue 4e: completed:false on finished sessions fixed
   - Issue 5:  Leaderboard shows ALL participants per specific session
   - Issue 6:  All timestamps in IST (Asia/Kolkata) AM/PM format
   - Issue 9:  Same user from multiple devices counts as 1 user (email-based)
   - Issue 12: Incomplete session score penalised by time remaining
   - Issue 14: Server-side timer — endTime from server, not client
   - Issue 15: Accurate final scores sent to all clients
   - Issue 16: Accurate data sent to MongoDB
   ============================================================ */

const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const session    = require('express-session');
const cookieParser = require('cookie-parser');
const path       = require('path');

const connectDB       = require('./config/db');
const authRoutes      = require('./routes/auth');
const sessionRoutes   = require('./routes/sessions');
const Session         = require('./models/Session');

connectDB();

const app    = express();
const server = http.createServer(app);
const io     = new Server(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: 'focussync_secret_key_2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/auth',    authRoutes);
app.use('/api',         sessionRoutes);

app.get('/',           (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/login',      (req, res) => res.sendFile(path.join(__dirname, 'public', 'pages', 'login.html')));
app.get('/signup',     (req, res) => res.sendFile(path.join(__dirname, 'public', 'pages', 'signup.html')));
app.get('/dashboard',  (req, res) => res.sendFile(path.join(__dirname, 'public', 'pages', 'dashboard.html')));
app.get('/room',       (req, res) => res.sendFile(path.join(__dirname, 'public', 'pages', 'room.html')));
app.get('/leaderboard',(req, res) => res.sendFile(path.join(__dirname, 'public', 'pages', 'leaderboard.html')));

// ─── In-memory Room State ───────────────────────────────────
// Each room entry:
// {
//   userCount            : number of unique live users
//   distractionCount     : running total distractions
//   session              : boolean – session in progress?
//   endTime              : server epoch ms when session will end
//   sessionStartTime     : server epoch ms when session started (for ratio calc)
//   sessionDocId         : MongoDB _id of the active Session doc
//   creatorSocketId      : socket.id of whoever called start_session
//   uniqueEmails         : Set<email>   – dedup same user on multiple tabs (FIX-1)
//   socketToEmail        : Map<socketId, email>
//   socketToUser         : Map<socketId, { name, email }>
//   perEmailDistractions : Map<email, count>
//   distractedSockets    : Set<socketId> – sockets in a distraction window (FIX-2/4d)
// }
const activeSessions = {};

function getRoomState(roomId) {
  if (!activeSessions[roomId]) {
    activeSessions[roomId] = {
      userCount:             0,
      distractionCount:      0,
      session:               false,
      endTime:               null,
      sessionStartTime:      null,
      sessionDocId:          null,
      creatorSocketId:       null,
      uniqueEmails:          new Set(),    // FIX-1: email-based dedup
      socketToEmail:         new Map(),    // FIX-1
      socketToUser:          new Map(),    // name lookup (for display)
      perEmailDistractions:  new Map(),    // FIX-1: per-email distraction count
      distractedSockets:     new Set()     // FIX-2: suppress leave on tab-switch
    };
  }
  return activeSessions[roomId];
}

// ─── Broadcast participant list ─────────────────────────────
function broadcastParticipants(roomId) {
  var state = activeSessions[roomId];
  if (!state) return;
  // FIX-1: expose email + name; deduplicate by email
  var seen = new Set();
  var participants = [];
  state.socketToUser.forEach(function(info, sid) {
    if (!seen.has(info.email)) {
      seen.add(info.email);
      participants.push({ socketId: sid, userName: info.name, userEmail: info.email });
    }
  });
  io.to(roomId).emit('participants_update', participants);
}


// ─── Socket.io ──────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // ── JOIN ROOM ───────────────────────────────────────────
  // FIX-1: accept userEmail so we dedup and track by email
  socket.on('join_room', async ({ roomId, userName, userEmail }) => {
    socket.join(roomId);
    socket.roomId    = roomId;
    socket.userName  = userName  || 'Anonymous';
    socket.userEmail = userEmail || userName || 'anonymous@unknown';   // FIX-1

    var state = getRoomState(roomId);

    state.socketToEmail.set(socket.id, socket.userEmail);
    state.socketToUser.set(socket.id, { name: socket.userName, email: socket.userEmail });

    // FIX-1: count unique emails (not names)
    state.uniqueEmails.add(socket.userEmail);
    state.userCount = state.uniqueEmails.size;

    io.to(roomId).emit('user_count', state.userCount);
    broadcastParticipants(roomId);

    // Sync late joiners to running session
    if (state.session && state.endTime) {
      var remaining = Math.max(0, Math.floor((state.endTime - Date.now()) / 1000));
      socket.emit('session_sync', {
        remaining,
        endTime:          state.endTime,
        distractionCount: state.distractionCount,
        // FIX-3: tell client who the creator is so non-creators hide End button
        creatorSocketId:  state.creatorSocketId
      });

      if (state.sessionDocId) {
        try {
          await Session.findByIdAndUpdate(state.sessionDocId, {
            $addToSet: { usernames: socket.userEmail },  // FIX-1: store email
            $push:     { events: { type: 'join', username: socket.userEmail, timestamp: new Date() } }
          });
        } catch (e) { console.error('Join event update error:', e); }
      }
    }

    socket.emit('distraction_count', state.distractionCount);
    console.log(`${socket.userName} (${socket.userEmail}) joined room: ${roomId}`);
  });


  // ── START SESSION ───────────────────────────────────────
  // FIX-3: record creatorSocketId so only they can end it
  socket.on('start_session', async ({ roomId, duration, userId, userName, userEmail }) => {
    try {
      var durationMs      = duration * 60 * 1000;
      var startTime       = new Date();
      var endTimeMs       = startTime.getTime() + durationMs;

      var state = getRoomState(roomId);
      state.distractionCount     = 0;
      state.endTime              = endTimeMs;
      state.sessionStartTime     = startTime.getTime();   // FIX-4b: needed for ratio
      state.session              = true;
      state.sessionDocId         = null;
      state.creatorSocketId      = socket.id;             // FIX-3
      state.perEmailDistractions.clear();
      state.distractedSockets.clear();                    // FIX-2

      // Collect current participants by email (FIX-1)
      var sockets = await io.in(roomId).fetchSockets();
      var uniqueEmailSet = new Set();
      var emailToName    = new Map();
      sockets.forEach(function(s) {
        if (s.userEmail) {
          uniqueEmailSet.add(s.userEmail);
          emailToName.set(s.userEmail, s.userName || s.userEmail);
        }
      });
      // include the person who emitted start_session
      var creatorEmail = userEmail || userName || 'anonymous@unknown';
      uniqueEmailSet.add(creatorEmail);
      emailToName.set(creatorEmail, userName || creatorEmail);

      var emailsArray = Array.from(uniqueEmailSet);

      // FIX-4c / FIX-4b: Save doc with null actualDurationSecs (not 0)
      var sessionDoc = new Session({
        roomId,
        userId:             userId  || null,
        userName:           userName || 'Anonymous',
        userEmail:          creatorEmail,
        startTime,
        duration,
        actualDurationSecs: null,    // FIX-4a: null until session ends (not 0)
        completed:          false,
        usernames:          emailsArray,
        events:             emailsArray.map(function(email) {
          return { type: 'join', username: email, timestamp: startTime };
        })
      });
      await sessionDoc.save();
      state.sessionDocId = sessionDoc._id.toString();

      // Notify all clients (FIX-3: include creatorSocketId)
      io.to(roomId).emit('session_started', {
        startTime:       startTime.getTime(),
        endTime:         endTimeMs,
        duration,
        creatorSocketId: socket.id   // FIX-3: clients use this to show/hide End button
      });

      broadcastParticipants(roomId);
      console.log(`Session started in room ${roomId} for ${duration} mins by ${socket.userEmail}`);

      // Server-authoritative auto-end (FIX-14)
      var capturedDocId = state.sessionDocId;
      setTimeout(async function () {
        var cur = activeSessions[roomId];
        if (cur && cur.session && cur.sessionDocId === capturedDocId) {
          await finaliseSession(roomId, true);
        }
      }, durationMs + 2000);

    } catch (err) {
      console.error('Start session error:', err);
      socket.emit('error_msg', 'Failed to start session');
    }
  });


  // ── DISTRACTION EVENT ───────────────────────────────────
  // FIX-2 / FIX-4d: mark socket as "distracted" to suppress spurious leave
  socket.on('distraction', async ({ roomId, source, userName, userEmail }) => {
    var state = activeSessions[roomId];
    if (!state || !state.session) return;

    // FIX-2: mark this socket so disconnect within 5s won't log a leave
    state.distractedSockets.add(socket.id);
    setTimeout(function() {
      if (state.distractedSockets) state.distractedSockets.delete(socket.id);
    }, 5000);

    // FIX-1: resolve email
    var email = userEmail || socket.userEmail || userName || 'unknown';
    state.distractionCount += 1;
    state.perEmailDistractions.set(email, (state.perEmailDistractions.get(email) || 0) + 1);

    var count = state.distractionCount;
    io.to(roomId).emit('distraction_count', count);
    io.to(roomId).emit('distraction_detected', {
      count, source: source || 'unknown', timestamp: Date.now()
    });

    if (state.sessionDocId) {
      try {
        await Session.findByIdAndUpdate(state.sessionDocId, {
          $inc:  { distractions: 1 },
          $push: {
            distractionTimestamps: Date.now(),
            events: { type: 'distraction', username: email, timestamp: new Date() }
          }
        });
      } catch (e) { console.error('Distraction update error:', e); }
    }
  });


  // ── END SESSION ─────────────────────────────────────────
  // FIX-3: only the creator can manually end the session
  socket.on('end_session', async ({ roomId }) => {
    var state = activeSessions[roomId];
    if (!state || !state.session) return;

    // FIX-3: gate on creatorSocketId
    if (state.creatorSocketId && socket.id !== state.creatorSocketId) {
      socket.emit('error_msg', 'Only the session creator can end the session.');
      return;
    }

    await finaliseSession(roomId, false);
  });


  // ── DISCONNECT ──────────────────────────────────────────
  // FIX-2: skip leave log if this socket is in a distraction window
  socket.on('disconnect', () => {
    var roomId = socket.roomId;
    if (roomId && activeSessions[roomId]) {
      var state = activeSessions[roomId];

      // FIX-2: if socket just reported a distraction, don't log as leave
      var wasDistracted = state.distractedSockets.has(socket.id);
      state.distractedSockets.delete(socket.id);

      state.socketToEmail.delete(socket.id);
      state.socketToUser.delete(socket.id);

      // FIX-1: check if this email still has other active sockets in the room
      var stillHere = false;
      state.socketToEmail.forEach(function(email) {
        if (email === socket.userEmail) stillHere = true;
      });
      if (!stillHere) state.uniqueEmails.delete(socket.userEmail);

      state.userCount = state.uniqueEmails.size;
      io.to(roomId).emit('user_count', state.userCount);
      broadcastParticipants(roomId);

      // FIX-2: only push a leave event when it's NOT caused by a distraction tab-switch
      if (!wasDistracted && state.sessionDocId) {
        Session.findByIdAndUpdate(state.sessionDocId, {
          $push: { events: { type: 'leave', username: socket.userEmail || 'unknown', timestamp: new Date() } }
        }).catch(function(e) { console.error('Leave event error:', e); });
      }
    }
    console.log('Socket disconnected:', socket.id);
  });


  // ─── Finalise session ────────────────────────────────────
  // FIX-4b: distractions already recorded before this runs
  // FIX-4c: single focusScore formula, no calculateFocusScore conflict
  // FIX-4e: completed = true only when server timeout fires
  async function finaliseSession(roomId, serverTriggered) {
    var state = activeSessions[roomId];
    if (!state || !state.session) return;

    var endTime      = new Date();
    var distractions = state.distractionCount;
    var focusScore   = 100;

    if (state.sessionDocId) {
      try {
        var doc = await Session.findById(state.sessionDocId);
        if (doc) {
          doc.endTime      = endTime;
          doc.distractions = distractions;
          doc.completed    = serverTriggered;  // FIX-4e: true only on timeout

          // FIX-4a / FIX-4b: compute actualDurationSecs from actual times
          var actualMs       = endTime.getTime() - doc.startTime.getTime();
          var plannedMs      = (doc.duration || 0) * 60 * 1000;
          doc.actualDurationSecs = Math.round(actualMs / 1000);  // FIX-4a: no longer 0

          var completionRatio    = plannedMs > 0 ? Math.min(1, actualMs / plannedMs) : 1;

          // FIX-4c: single score formula (no virtual / method conflict)
          var baseScore          = Math.max(0, 100 - distractions * 10);
          var incompletePenalty  = serverTriggered ? 0 : Math.round((1 - completionRatio) * 30);
          focusScore             = Math.max(0, baseScore - incompletePenalty);
          doc.focusScore         = focusScore;

          // FIX-1: per-email scores in userScores array
          doc.userScores = Array.from(state.uniqueEmails).map(function(email) {
            var userDist  = state.perEmailDistractions.get(email) || 0;
            var uBase     = Math.max(0, 100 - userDist * 10);
            var uScore    = serverTriggered ? uBase : Math.max(0, uBase - incompletePenalty);
            return { username: email, focusScore: uScore, leaveTime: endTime };
          });

          await doc.save();
        }
      } catch (e) { console.error('Finalise session error:', e); }
    }

    // FIX-4c / FIX-4b: recalculate for payload using same formula
    // Use sessionStartTime (stored when session started) for accurate ratio
    var actualMs2     = endTime.getTime() - (state.sessionStartTime || endTime.getTime());
    var plannedMs2    = 0;
    // Try to get plannedMs from endTime and sessionStartTime
    if (state.sessionStartTime && state.endTime) {
      plannedMs2 = state.endTime - state.sessionStartTime;
    }
    var compRatio2       = plannedMs2 > 0 ? Math.min(1, actualMs2 / plannedMs2) : 1;
    var incompletePenalty2 = serverTriggered ? 0 : Math.round((1 - compRatio2) * 30);

    var userScoresPayload = Array.from(state.uniqueEmails).map(function(email) {
      var userDist = state.perEmailDistractions.get(email) || 0;
      var uBase    = Math.max(0, 100 - userDist * 10);
      var uScore   = Math.max(0, uBase - incompletePenalty2);
      return { username: email, focusScore: uScore };
    });

    // Reset room state
    state.session              = false;
    state.endTime              = null;
    state.sessionStartTime     = null;
    state.distractionCount     = 0;
    state.sessionDocId         = null;
    state.creatorSocketId      = null;
    state.perEmailDistractions.clear();
    state.distractedSockets.clear();

    // FIX-5 / FIX-15: include full userScores, sessionDocId not cleared yet above for broadcast
    io.to(roomId).emit('session_ended', {
      focusScore, distractions,
      userScores: userScoresPayload,
      completed:  serverTriggered   // FIX-4e
    });
    io.emit('session_complete', { roomId, focusScore, distractions });
  }
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`FocusSync server running on http://localhost:${PORT}`);
});
