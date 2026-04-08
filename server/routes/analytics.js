// ============================================
// Analytics Routes - Educational Example
// ============================================
// SYLLABUS: CO4 - MongoDB Aggregation Pipeline
//
// These routes demonstrate:
// - MongoDB queries with filters
// - Pagination for large datasets
// - Aggregation pipeline for analytics
// ============================================

const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const auth = require('../middleware/auth');

// ============================================
// GET /api/analytics/all - Get all sessions (paginated)
// ============================================
// Query params: ?page=1&limit=20
router.get('/analytics/all', auth, async (req, res) => {
  try {
    // Pagination: page and limit from query string
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // MongoDB queries: find(), sort(), skip(), limit()
    const sessions = await Session.find()
      .sort({ createdAt: -1 })  // -1 = descending (newest first)
      .skip(skip)                // Skip records for pagination
      .limit(limit);             // Limit results per page
    
    const total = await Session.countDocuments();
    res.json({ sessions, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// GET /api/analytics/:roomId - Get sessions by room
// ============================================
router.get('/analytics/:roomId', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Filter by roomId using req.params
    const sessions = await Session.find({ roomId: req.params.roomId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Session.countDocuments({ roomId: req.params.roomId });
    res.json({ sessions, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// GET /api/leaderboard - Top study rooms
// ============================================
// Uses MongoDB Aggregation Pipeline
// Groups sessions by room, calculates totals
router.get('/leaderboard', async (req, res) => {
  try {
    // Aggregation pipeline: process documents through multiple stages
    const leaderboard = await Session.aggregate([
      // STAGE 1: $group - Group documents by roomId
      // Calculate totals for each group
      { 
        $group: { 
          _id: '$roomId',  // Group by roomId
          totalFocusTime: { 
            $sum: { $subtract: [{ $ifNull: ['$endTime', new Date()] }, '$startTime'] } 
          }, 
          totalSessions: { $sum: 1 }, 
          avgFocusScore: { $avg: '$focusScore' } 
        } 
      },
      // STAGE 2: $sort - Sort by totalFocusTime descending
      { $sort: { totalFocusTime: -1 } },
      // STAGE 3: $limit - Return only top 10
      { $limit: 10 },
    ]);
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// GET /api/heatmap - Daily session counts
// ============================================
// Groups sessions by date for calendar heatmap
router.get('/heatmap', async (req, res) => {
  try {
    const heatmap = await Session.aggregate([
      // Group by date (format: YYYY-MM-DD)
      { 
        $group: { 
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, 
          sessionCount: { $sum: 1 }, 
          totalFocusTime: { $sum: { $subtract: [{ $ifNull: ['$endTime', new Date()] }, '$startTime'] } } 
        } 
      },
      // Sort by date ascending
      { $sort: { _id: 1 } },
    ]);
    res.json(heatmap);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// GET /api/insights - Behavioral analysis
// ============================================
// Calculates patterns in user's study behavior
router.get('/insights', auth, async (req, res) => {
  try {
    // Get recent sessions for analysis
    const sessions = await Session.find().sort({ createdAt: -1 }).limit(50);
    
    // Calculate behavioral metrics
    let totalDistractions = 0;
    let totalSessionTime = 0;
    let distractionIntervals = [];
    let completedSessions = 0;

    sessions.forEach(session => {
      if (session.startTime && session.endTime) {
        // Calculate session duration in milliseconds
        const sessionTime = new Date(session.endTime) - new Date(session.startTime);
        totalSessionTime += sessionTime;
        totalDistractions += session.distractions || 0;
        completedSessions++;

        // Analyze distraction patterns
        if (session.events && session.distractions > 0) {
          const distractionEvents = session.events.filter(e => e.type === 'distraction');
          
          // Time between consecutive distractions
          if (distractionEvents.length > 1) {
            for (let i = 1; i < distractionEvents.length; i++) {
              const interval = new Date(distractionEvents[i].time) - new Date(distractionEvents[i - 1].time);
              distractionIntervals.push(interval);
            }
          }
          
          // Time from start to first distraction
          if (distractionEvents.length > 0) {
            const firstInterval = new Date(distractionEvents[0].time) - new Date(session.startTime);
            distractionIntervals.push(firstInterval);
          }
        }
      }
    });

    // Calculate average time between distractions (in minutes)
    let avgTimeBetweenDistractions = null;
    if (distractionIntervals.length > 0) {
      const sum = distractionIntervals.reduce((a, b) => a + b, 0);
      avgTimeBetweenDistractions = Math.round(sum / distractionIntervals.length / 60000);
    }

    // Calculate efficiency score
    let efficiency = 100;
    if (completedSessions > 0 && totalDistractions > 0) {
      efficiency = Math.max(0, Math.round(100 - (totalDistractions / completedSessions) * 10));
    }

    // Return insights
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

// ============================================
// HELPER: Focus Classification
// ============================================
// Classifies focus level based on score
function classifyFocus(focusScore) {
  if (focusScore >= 80) return { level: 'HIGH', color: '#22c55e', icon: '🌟' };
  if (focusScore >= 50) return { level: 'MEDIUM', color: '#f59e0b', icon: '👍' };
  return { level: 'LOW', color: '#ef4444', icon: '💪' };
}

module.exports = router;
module.exports.classifyFocus = classifyFocus;
