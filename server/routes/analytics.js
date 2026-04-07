const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const auth = require('../middleware/auth');

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

module.exports = router;
