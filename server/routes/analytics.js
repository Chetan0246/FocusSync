const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const auth = require('../middleware/auth');

// Get all sessions with pagination
router.get('/analytics/all', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const sessions = await Session.find().sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total = await Session.countDocuments();
    res.json({ sessions, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get sessions by roomId with pagination
router.get('/analytics/:roomId', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const sessions = await Session.find({ roomId: req.params.roomId }).sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total = await Session.countDocuments({ roomId: req.params.roomId });
    res.json({ sessions, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const leaderboard = await Session.aggregate([
      { $group: { _id: '$roomId', totalFocusTime: { $sum: { $subtract: [{ $ifNull: ['$endTime', new Date()] }, '$startTime'] } }, totalSessions: { $sum: 1 }, avgFocusScore: { $avg: '$focusScore' } } },
      { $sort: { totalFocusTime: -1 } },
      { $limit: 10 },
    ]);
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get heatmap data
router.get('/heatmap', async (req, res) => {
  try {
    const heatmap = await Session.aggregate([
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, sessionCount: { $sum: 1 }, totalFocusTime: { $sum: { $subtract: [{ $ifNull: ['$endTime', new Date()] }, '$startTime'] } } } },
      { $sort: { _id: 1 } },
    ]);
    res.json(heatmap);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get behavioral insights - calculates average time between distractions
router.get('/insights', auth, async (req, res) => {
  try {
    // Get all user's sessions
    const sessions = await Session.find().sort({ createdAt: -1 }).limit(50);
    
    // Calculate behavioral insights
    let totalDistractions = 0;
    let totalSessionTime = 0;
    let distractionIntervals = [];
    let completedSessions = 0;

    sessions.forEach(session => {
      if (session.startTime && session.endTime) {
        const sessionTime = new Date(session.endTime) - new Date(session.startTime);
        totalSessionTime += sessionTime;
        totalDistractions += session.distractions || 0;
        completedSessions++;

        // Calculate time between distractions for this session
        if (session.events && session.distractions > 0) {
          const distractionEvents = session.events.filter(e => e.type === 'distraction');
          if (distractionEvents.length > 1) {
            for (let i = 1; i < distractionEvents.length; i++) {
              const interval = new Date(distractionEvents[i].time) - new Date(distractionEvents[i - 1].time);
              distractionIntervals.push(interval);
            }
          }
          // First distraction interval (from start)
          if (distractionEvents.length > 0) {
            const firstInterval = new Date(distractionEvents[0].time) - new Date(session.startTime);
            distractionIntervals.push(firstInterval);
          }
        }
      }
    });

    // Calculate average time between distractions
    let avgTimeBetweenDistractions = null;
    if (distractionIntervals.length > 0) {
      const sum = distractionIntervals.reduce((a, b) => a + b, 0);
      avgTimeBetweenDistractions = Math.round(sum / distractionIntervals.length / 60000); // in minutes
    }

    // Calculate overall efficiency
    let efficiency = 100;
    if (completedSessions > 0 && totalDistractions > 0) {
      efficiency = Math.max(0, Math.round(100 - (totalDistractions / completedSessions) * 10));
    }

    res.json({
      avgTimeBetweenDistractions, // minutes
      totalDistractions,
      totalSessions: completedSessions,
      totalFocusTime: totalSessionTime,
      efficiency,
      distractionCount: distractionIntervals.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Classify focus level based on score
function classifyFocus(focusScore) {
  if (focusScore >= 80) return { level: 'HIGH', color: '#22c55e', icon: '🌟' };
  if (focusScore >= 50) return { level: 'MEDIUM', color: '#f59e0b', icon: '👍' };
  return { level: 'LOW', color: '#ef4444', icon: '💪' };
}

module.exports = router;
module.exports.classifyFocus = classifyFocus;
