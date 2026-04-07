// Import mongoose for creating the database schema
const mongoose = require('mongoose');

// Define the Session schema - stores each study session's data
const SessionSchema = new mongoose.Schema({
  // The study room identifier
  roomId: {
    type: String,
    required: true,
  },
  // When the session started
  startTime: {
    type: Date,
    required: true,
  },
  // When the session ended
  endTime: {
    type: Date,
  },
  // Number of times user got distracted during the session
  distractions: {
    type: Number,
    default: 0,
  },
  // Focus score calculated as: 100 - (distractions * 10)
  focusScore: {
    type: Number,
    default: 100,
  },
  // Array of events that happened during the session
  // Each event has a type (start, distraction, end) and a timestamp
  events: [
    {
      type: {
        type: String,
        required: true,
      },
      time: {
        type: Date,
        required: true,
      },
    },
  ],
}, {
  // Automatically add createdAt and updatedAt fields
  timestamps: true,
});

// Create and export the Session model
module.exports = mongoose.model('Session', SessionSchema);
