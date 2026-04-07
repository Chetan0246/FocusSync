# FocusSync

Real-time collaborative study platform with synchronized timer, distraction tracking, and analytics dashboard.

## Features

- **Real-time Sync**: Server-controlled timer visible to all users
- **Late Join Support**: New users sync to remaining session time
- **Distraction Detection**: Page Visibility API tracks when users leave the tab
- **Analytics Dashboard**: View sessions, leaderboard, and heatmaps
- **Focus Score**: Calculated based on distraction count

## Project Structure

```
focus-sync/
├── client/                 # React frontend
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── components/     # React components
│       │   ├── Navbar.jsx
│       │   └── Timer.jsx
│       ├── pages/          # Page components
│       │   ├── Home.jsx
│       │   ├── Room.jsx
│       │   └── Dashboard.jsx
│       ├── App.jsx         # Main app with routing
│       ├── App.css         # Styles
│       └── index.js        # Entry point
├── server/                 # Node.js backend
│   ├── config/
│   │   └── db.js           # MongoDB connection
│   ├── models/
│   │   └── Session.js      # Mongoose schema
│   ├── routes/
│   │   └── analytics.js    # REST API routes
│   └── index.js            # Server entry point
```

## Setup

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (running locally or use MongoDB Atlas)

### Backend Setup

1. Navigate to server folder:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

   Server runs on http://localhost:5000

### Frontend Setup

1. Navigate to client folder:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the React app:
   ```bash
   npm start
   ```

   App runs on http://localhost:3000

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analytics/all` | GET | Get all sessions |
| `/api/analytics/:roomId` | GET | Get sessions for a room |
| `/api/leaderboard` | GET | Get top rooms by focus time |
| `/api/heatmap` | GET | Get sessions grouped by date |

## Socket.io Events

### Client → Server
- `join_room` - Join a study room
- `start_session` - Start a new focus session
- `distraction` - Report a distraction event
- `end_session` - End the current session

### Server → Client
- `user_count` - Update online user count
- `distraction_count` - Update distraction count
- `session_started` - Notify session started
- `session_sync` - Sync late joiners with remaining time
- `session_ended` - Notify session ended

## How to Use

1. **Home Page**: Create a new room or enter an existing room ID
2. **Room Page**: 
   - Select session duration
   - Click "Start Focus Session"
   - Stay on the tab to avoid distractions
   - View distraction count in real-time
3. **Dashboard**: View analytics, leaderboard, and session history

## Technologies

- **Frontend**: React, React Router, Socket.io Client, Axios
- **Backend**: Node.js, Express, Socket.io, MongoDB (Mongoose)
- **Styling**: Custom CSS (Dark theme)

## Environment Variables

For MongoDB connection:
```
MONGO_URI=mongodb://localhost:27017/focussync
```

## License

MIT
