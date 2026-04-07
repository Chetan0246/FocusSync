const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  roomId: { type: String, required: true },
  userId: { type: String },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  distractions: { type: Number, default: 0 },
  focusScore: { type: Number, default: 100 },
  events: [{
    type: { type: String, required: true },
    time: { type: Date, required: true },
  }],
}, { timestamps: true });

SessionSchema.index({ roomId: 1, createdAt: -1 });
SessionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Session', SessionSchema);
