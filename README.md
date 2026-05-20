# FocusSync — Real-Time Collaborative Study Timer

FocusSync is a real-time collaborative study timer where users join rooms and participate in shared focus sessions. Your focus score is calculated based on how many distractions you encounter and whether you complete the full session. Join a room, stay focused, and climb the leaderboard.

---

## Features

- **Real-time Room Collaboration** – Join a study room by ID and start a shared countdown timer with other users
- **Live Distraction Tracking** – Track distractions per user in real time; each distraction reduces your focus score by 10 points
- **Smart Focus Scoring** – Start at 100 points; lose 10 per distraction; earn up to +10 completion bonus if you finish; get penalized proportionally if you leave early
- **Leaderboard Rankings** – View the top 10 users by average focus score (completed sessions only)
- **Session History** – Review all your sessions with a filter for completed vs. incomplete
- **Daily Streak Tracking** – Maintain a focus streak with automatic timezone detection (IST)
- **Multi-Device Support** – Seamlessly switch devices; the system deduplicates your identity across multiple connections
- **Strong Authentication** – Secure login/signup with password policy enforcement (8+ chars, uppercase, number, special character)
- **Profile Management** – Update your username and password; delete your account if needed

---

## Tech Stack

| Layer      | Technology                          | Purpose                    |
|------------|-------------------------------------|----------------------------|
| HTML       | HTML5 semantic tags, forms, iframes | Frontend markup            |
| CSS        | CSS3, Box Model, Flexbox, Bootstrap | Responsive styling         |
| JavaScript | DOM, Events, AJAX (XMLHttpRequest)  | Client-side interactivity  |
| Backend    | Node.js, Express.js, Routing        | REST API and server logic  |
| Auth       | Express Sessions, Cookies, bcryptjs | Secure authentication      |
| Database   | MongoDB + Mongoose (ODM)            | User and session storage   |
| Real-time  | Socket.IO (WebSockets)              | Live timer and events      |

---

## Project Structure

```
focussync-syllabus/
└── server/
    ├── config/
    │   └── db.js
    ├── middleware/
    │   └── auth.js
    ├── models/
    │   ├── User.js
    │   └── Session.js
    ├── routes/
    │   ├── auth.js
    │   └── sessions.js
    ├── public/
    │   ├── css/
    │   │   └── style.css
    │   ├── js/
    │   │   ├── app.js
    │   │   └── analytics.js
    │   ├── index.html
    │   └── pages/
    │       ├── login.html
    │       ├── signup.html
    │       ├── dashboard.html
    │       ├── room.html
    │       └── leaderboard.html
    ├── index.js
    └── package.json
```

---

## Setup & Run

### Prerequisites
- Node.js (v14+)
- MongoDB running locally OR MongoDB Atlas URI

### Installation

```bash
cd server
npm install
npm start
```

Open your browser and navigate to: **http://localhost:8080**

---

## How Focus Scoring Works

Your focus score is calculated dynamically based on session completion and distractions.

### Completed Session
```
focusScore = max(0, min(100, (100 - distractions × 10) + completionBonus))
completionBonus = round(completionRatio × 10)   // up to +10 points
```

**Example:** A 30-minute session where you complete it with 2 distractions:
- Base: 100 − (2 × 10) = 80 points
- Completion bonus: +10 (you finished on time)
- **Final score: 90**

### Incomplete Session (Ended Early)
```
completionRatio = actualDurationSecs / plannedDurationSecs
incompletePenalty = round((1 - completionRatio) × 30)
focusScore = max(0, (100 - distractions × 10) - incompletePenalty)
```

**Example:** A 30-minute session where you left after 15 minutes with 1 distraction:
- Completion ratio: 15/30 = 0.5
- Penalty: (1 − 0.5) × 30 = 15 points
- Base score: 100 − (1 × 10) = 90
- **Final score: 90 − 15 = 75**

### Leaderboard
The leaderboard ranks users by their **average focus score across all completed sessions only**.

---

## API Endpoints

### Authentication
| Method | URL                           | Description                    | Auth |
|--------|-------------------------------|--------------------------------|------|
| POST   | /api/auth/signup              | Register new user              | No   |
| POST   | /api/auth/login               | Login                          | No   |
| POST   | /api/auth/logout              | Logout                         | No   |
| GET    | /api/auth/me                  | Get current user + streak      | Yes  |
| PUT    | /api/auth/update-profile      | Update username / password     | Yes  |
| DELETE | /api/auth/delete-account      | Permanently delete account     | Yes  |
| POST   | /api/auth/update-streak       | Update daily focus streak      | Yes  |

### Sessions & Stats
| Method | URL               | Description                        | Auth |
|--------|-------------------|------------------------------------|------|
| GET    | /api/sessions     | Session history (all sessions)     | Yes  |
| GET    | /api/rooms        | Distinct room IDs for current user | Yes  |
| GET    | /api/stats        | Aggregate stats (completed only)   | Yes  |
| GET    | /api/leaderboard  | Top 10 users by avg focus score    | Yes  |

---

## Socket.IO Events

### Client → Server
| Event           | Payload                                      | Description               |
|-----------------|----------------------------------------------|---------------------------|
| `join_room`     | `{ roomId, userName }`                       | Join a study room         |
| `start_session` | `{ roomId, duration, userId, userName }`     | Start focus session       |
| `distraction`   | `{ roomId, source, userName }`               | Report a distraction      |
| `end_session`   | `{ roomId }`                                 | End session for all       |

### Server → Client
| Event                 | Payload                                           | Description                      |
|-----------------------|---------------------------------------------------|----------------------------------|
| `user_count`          | `number`                                          | Unique users in room             |
| `participants_update` | `[{ socketId, userName }]`                        | Live participant list            |
| `distraction_count`   | `number`                                          | Total distractions               |
| `distraction_detected`| `{ count, source, timestamp }`                    | Enriched distraction event       |
| `session_started`     | `{ startTime, endTime, duration }`                | Session began (server clock)     |
| `session_sync`        | `{ remaining, endTime, distractionCount }`        | Late joiner sync                 |
| `session_ended`       | `{ focusScore, distractions, userScores, completed }` | Session complete             |
| `session_complete`    | `{ roomId, focusScore, distractions }`            | Global broadcast for dashboard   |

---

## Password Policy

All passwords must meet these requirements:
- Minimum **8 characters**
- At least **1 uppercase** letter (A–Z)
- At least **1 number** (0–9)
- At least **1 special character** (`!@#$%^&*`)

Password strength is validated on both the client (real-time checklist) and server (API validation).

---

## Database Configuration

The default MongoDB URI is: `mongodb://localhost:27017/focussync_final`

To use MongoDB Atlas instead, edit `server/config/db.js` and replace the URI:
```js
await mongoose.connect('YOUR_ATLAS_URI_HERE');
```
