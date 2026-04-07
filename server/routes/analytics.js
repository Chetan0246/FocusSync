// Import Express router and Session model
const express = require('express');
const router = express.Router();
const Session = require('../models/Session');

// GET /api/analytics/all
// Returns all sessions from all rooms
router.get('/analytics/all', async (req, res) => {
  try {
    const sessions = await Session.find()
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/analytics/:roomId
// Returns all sessions for a specific room
router.get('/analytics/:roomId', async (req, res) => {
  try {
    // Find all sessions for the given room, sorted by newest first
    const sessions = await Session.find({ roomId: req.params.roomId })
      .sort({ createdAt: -1 });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/leaderboard
// Returns top rooms sorted by total focus time
router.get('/leaderboard', async (req, res) => {
  try {
    // Use MongoDB aggregation to group sessions by roomId
    // and calculate total focus time for each room
    const leaderboard = await Session.aggregate([
      {
        // Group sessions by roomId
        $group: {
          _id: '$roomId',
          totalFocusTime: {
            // Sum up the duration of all sessions in milliseconds
            $sum: {
              $subtract: [
                { $ifNull: ['$endTime', new Date()] },
                '$startTime',
              ],
            },
          },
          totalSessions: { $sum: 1 },
          avgFocusScore: { $avg: '$focusScore' },
        },
      },
      // Sort by total focus time in descending order
      { $sort: { totalFocusTime: -1 } },
      // Limit to top 10 rooms
      { $limit: 10 },
    ]);
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/heatmap
// Returns sessions grouped by date for heatmap visualization
router.get('/heatmap', async (req, res) => {
  try {
    // Use MongoDB aggregation to group sessions by date
    const heatmap = await Session.aggregate([
      {
        $group: {
          // Group by date string (YYYY-MM-DD format)
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          sessionCount: { $sum: 1 },
          totalFocusTime: {
            $sum: {
              $subtract: [
                { $ifNull: ['$endTime', new Date()] },
                '$startTime',
              ],
            },
          },
        },
      },
      // Sort by date in ascending order
      { $sort: { _id: 1 } },
    ]);
    res.json(heatmap);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
