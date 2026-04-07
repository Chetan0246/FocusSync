# FocusSync - Technical Architecture

## Overview
FocusSync demonstrates real-time web communication using WebSockets, REST APIs, and client-server architecture.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │   React     │  │  Socket.io   │  │  Page Visibility API   │  │
│  │   App       │  │  Client      │  │  (Distraction Detect)  │  │
│  └──────┬──────┘  └──────┬───────┘  └───────────┬────────────┘  │
│         │                │                       │               │
│         └────────────────┼───────────────────────┘               │
│                          │ WebSocket/HTTP                        │
└──────────────────────────┼───────────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │  Port 5000  │
                    │   Server    │
┌───────────────────┼─────────────┼────────────────────────────────┐
│                   │             │              SERVER (Node.js)   │
│  ┌────────────────▼─────────────▼───────┐                         │
│  │         Express.js Server            │                         │
│  │  ┌──────────────┐  ┌──────────────┐  │                         │
│  │  │ Socket.io    │  │ REST API    │  │                         │
│  │  │ (Real-time)   │  │ (Analytics) │  │                         │
│  │  └───────┬──────┘  └──────┬───────┘  │                         │
│  │          │                │           │                         │
│  │  ┌───────▼────────────────▼───────┐ │                         │
│  │  │      In-Memory Session Store     │ │                         │
│  │  └──────────────────────────────────┘ │                         │
│  └───────────────────────────────────────┼─────────────────────────┘
│                                           │
│                                    ┌──────▼──────┐
│                                    │   MongoDB   │
│                                    │  Database   │
│                                    └─────────────┘
└──────────────────────────────────────────────────────────────────┘
```

## Web Technologies Demonstrated

### 1. WebSockets (Socket.io)
Real-time bidirectional communication between client and server.

```
Client                          Server
  │                                │
  │──── join_room ────────────────>│
  │<─── user_count ────────────────│
  │                                │
  │──── start_session ────────────>│
  │<─── session_started ──────────│
  │<─── session_sync ────────────│  (for late joiners)
  │                                │
  │──── distraction ──────────────>│
  │<─── distraction_count ────────│
```

### 2. REST API
Traditional HTTP request-response pattern for analytics.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/analytics/all` | Fetch all sessions |
| GET | `/api/analytics/:roomId` | Fetch room sessions |
| GET | `/api/leaderboard` | Top rooms by focus time |
| GET | `/api/heatmap` | Sessions by date |

### 3. Page Visibility API
Browser API to detect when user switches tabs (distraction).

```javascript
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    // User left the tab - emit distraction event
  }
});
```

### 4. MongoDB (Database)
NoSQL database for storing session data with Mongoose ODM.

### 5. React State Management
Client-side state using useState and useEffect hooks.

## Key Concepts for Viva

### Q: How does real-time sync work?
**A:** Server is authoritative. It stores `endTime` and sends it to all clients. 
Clients calculate remaining time locally using `Date.now()` and update every second.

### Q: What happens when a user joins late?
**A:** Server sends `session_sync` event with remaining seconds. Client calculates 
new `endTime = Date.now() + remaining * 1000` and starts countdown.

### Q: How are distractions detected?
**A:** Page Visibility API fires `visibilitychange` event when tab becomes hidden.
This is emitted to server via Socket.io.

### Q: Why use WebSockets instead of HTTP polling?
**A:** WebSockets maintain persistent connection, enabling instant bidirectional 
communication without repeated HTTP overhead.

### Q: How is focus score calculated?
**A:** `focusScore = 100 - (distractions × 10)`, minimum 0.

## Data Flow

```
1. User clicks "Start Session"
   └─> Client emits 'start_session'
       └─> Server creates MongoDB document
           └─> Server stores endTime in memory
               └─> Server broadcasts 'session_started' to room

2. Timer Update (every second)
   └─> Client calculates: remaining = endTime - Date.now()
       └─> Display formatted time

3. User switches tab
   └─> Browser fires 'visibilitychange'
       └─> Client emits 'distraction'
           └─> Server increments counter
               └─> Server updates MongoDB
                   └─> Server broadcasts new count

4. Session Ends
   └─> Client timer reaches 0
       └─> Client calls onExpire callback
           └─> Server emits 'session_ended'
               └─> Server calculates final focusScore
                   └─> Server saves to MongoDB
```

## File Structure Explanation

```
Server Files:
├── index.js          - Express + Socket.io setup, event handlers
├── config/db.js      - MongoDB connection
├── models/Session.js - Mongoose schema definition
└── routes/analytics.js - REST API endpoints

Client Files:
├── index.js          - React entry point
├── App.jsx           - Router setup
├── pages/
│   ├── Home.jsx      - Landing page (room creation/joining)
│   ├── Room.jsx      - Study room (timer, distraction tracking)
│   └── Dashboard.jsx - Analytics (charts, leaderboard, heatmap)
└── components/
    ├── Navbar.jsx    - Navigation
    └── Timer.jsx     - Countdown timer display
```

## Security Considerations (for discussion)
- Room IDs should be validated and sanitized
- Rate limiting on API endpoints
- Authentication for production use
- Input validation on all user data

## Scalability Considerations (for discussion)
- Redis for session storage (currently in-memory)
- Multiple server instances with Socket.io adapter
- Database indexing on roomId and createdAt
