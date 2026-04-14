/* ============================================================
   FocusSync - Sessions Routes  (server/routes/sessions.js)
   FIXED:
   - FIX-5:  GET /api/leaderboard now accepts ?sessionId= param
             and shows ALL participants for that session (not just top-10)
   - FIX-5:  Without ?sessionId it still shows global top-10 by avg score
   - FIX-1:  All usernames in DB are now emails; leaderboard uses them
   - FIX-6:  startTime returned as IST-aware ISO string (clients convert)
   ============================================================ */

const express  = require('express');
const router   = express.Router();
const Session  = require('../models/Session');
const User     = require('../models/User');

// ── Auth middleware ─────────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.status(401).json({ message: 'Not authenticated' });
}


// ── GET /api/sessions ───────────────────────────────────────
// Session history for the logged-in user
router.get('/sessions', requireAuth, async (req, res) => {
  try {
    var sessions = await Session.find({ userId: req.session.userId })
      .sort({ startTime: -1 })
      .limit(50);
    res.json({ sessions });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});


// ── GET /api/rooms ──────────────────────────────────────────
// Distinct room IDs this user has participated in
router.get('/rooms', requireAuth, async (req, res) => {
  try {
    var rooms = await Session.distinct('roomId', { userId: req.session.userId });
    res.json({ rooms });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});


// ── GET /api/stats ──────────────────────────────────────────
// Aggregate stats (completed sessions only)
router.get('/stats', requireAuth, async (req, res) => {
  try {
    var stats = await Session.getStatsForUser(req.session.userId);
    res.json(stats);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});


// ── GET /api/leaderboard ────────────────────────────────────
// FIX-5: Two modes:
//
// Mode A — Session leaderboard (pass ?sessionId=<mongoId>):
//   Returns ALL participants in that session with their individual
//   focusScore. This way the leaderboard is specific to the session
//   the user just completed, not a global combined view.
//
// Mode B — Global leaderboard (no ?sessionId):
//   Returns top-10 users by average focusScore across all their
//   COMPLETED sessions (unchanged behaviour, but now limited to
//   completed:true to avoid skewed scores from abandoned sessions).
//
router.get('/leaderboard', requireAuth, async (req, res) => {
  try {

    // ── Mode A: per-session leaderboard ──────────────────────
    if (req.query.sessionId) {
      var sessionDoc = await Session.findById(req.query.sessionId);
      if (!sessionDoc) {
        return res.status(404).json({ message: 'Session not found' });
      }

      // FIX-5: return every participant with their score
      // userScores[] is populated by finaliseSession on the server
      var entries;
      if (sessionDoc.userScores && sessionDoc.userScores.length > 0) {
        entries = sessionDoc.userScores
          .map(function(us) {
            return {
              email:      us.username,          // stored as email (FIX-1)
              focusScore: us.focusScore || 0
            };
          })
          .sort(function(a, b) { return b.focusScore - a.focusScore; });
      } else {
        // Fallback: all usernames with the room-level focusScore
        entries = (sessionDoc.usernames || []).map(function(email) {
          return { email: email, focusScore: sessionDoc.focusScore || 0 };
        });
      }

      return res.json({
        mode:      'session',
        sessionId: req.query.sessionId,
        roomId:    sessionDoc.roomId,
        startTime: sessionDoc.startTime,    // FIX-6: client converts to IST
        entries:   entries
      });
    }

    // ── Mode B: global leaderboard (top 10) ──────────────────
    var pipeline = [
      // Only count fully completed sessions
      { $match: { completed: true, userId: { $exists: true, $ne: null } } },
      {
        $group: {
          _id:            '$userId',
          avgScore:       { $avg: '$focusScore' },
          totalSessions:  { $sum: 1 },
          totalMins:      { $sum: '$duration' }
        }
      },
      { $sort: { avgScore: -1 } },
      { $limit: 10 }
    ];

    var results = await Session.aggregate(pipeline);

    // Hydrate userIds to get names/emails
    var userIds = results.map(function(r) { return r._id; });
    var users   = await User.find({ _id: { $in: userIds } }).select('name email');
    var userMap = {};
    users.forEach(function(u) { userMap[u._id.toString()] = u; });

    var entries = results.map(function(r) {
      var u = userMap[r._id.toString()] || {};
      return {
        name:          u.name  || 'Unknown',
        email:         u.email || '',
        avgScore:      Math.round(r.avgScore),
        totalSessions: r.totalSessions,
        totalMins:     r.totalMins || 0
      };
    });

    res.json({ mode: 'global', entries });

  } catch (e) {
    console.error('Leaderboard error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
