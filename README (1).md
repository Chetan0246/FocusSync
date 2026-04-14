# FocusSync — Syllabus Edition

> Real-time collaborative study timer built using **only syllabus-approved technologies**.

---

## 🛠 Tech Stack (All From Syllabus)

| Layer      | Technology                          | Syllabus Unit |
|------------|-------------------------------------|---------------|
| HTML       | HTML5 semantic tags, forms, iframes | Unit 1-3      |
| CSS        | CSS3, Box Model, Flexbox, Bootstrap | Unit 4-6      |
| JavaScript | DOM, Events, AJAX (XMLHttpRequest)  | Unit 2        |
| Backend    | Node.js, Express.js, Routing        | Unit 5        |
| Auth       | Express Sessions, Cookies, bcryptjs | Unit 5        |
| Database   | MongoDB + Mongoose (ODM)            | Unit 6        |
| Real-time  | Socket.io (WebSockets)              | Unit 5        |

> ✅ No React. No JWT. No Axios. No Helmet. No rate-limit. No Joi. Just your syllabus.

---

## 📁 Project Structure

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
    │   ├── auth.js           ← rename auth_route.js → auth.js
    │   └── sessions.js
    ├── public/
    │   ├── css/style.css
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

## 🚀 Setup & Run

### Prerequisites
- Node.js (v14+)
- MongoDB running locally OR MongoDB Atlas URI

### Steps

```bash
cd server
npm install
npm start
```

Open: **http://localhost:8080**

---

## 🔌 API Endpoints

### Auth
| Method | URL                           | Description                    | Auth |
|--------|-------------------------------|--------------------------------|------|
| POST   | /api/auth/signup              | Register new user              | No   |
| POST   | /api/auth/login               | Login                          | No   |
| POST   | /api/auth/logout              | Logout                         | No   |
| GET    | /api/auth/me                  | Get current user + streak      | Yes  |
| PUT    | /api/auth/update-profile      | Update username / password     | Yes  |
| DELETE | /api/auth/delete-account      | Permanently delete account     | Yes  |
| POST   | /api/auth/update-streak       | Update daily focus streak      | Yes  |

### Sessions
| Method | URL               | Description                        | Auth |
|--------|-------------------|------------------------------------|------|
| GET    | /api/sessions     | Session history (completed + incomplete) | Yes |
| GET    | /api/rooms        | Distinct room IDs for current user | Yes  |
| GET    | /api/stats        | Aggregate stats (completed only)   | Yes  |
| GET    | /api/leaderboard  | Top 10 users by avg focus score    | Yes  |

---

## ⚡ Socket.io Events

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

## 🔧 Recent Fixes (v2)

| # | Issue | Fix |
|---|-------|-----|
| 1 | No show/hide password | 👁 toggle on all password fields (login, signup, settings) |
| 2 | Weak password allowed | Min 8 chars + uppercase + number + special char enforced on frontend and backend |
| 3 | No real-time match check | Live ✓/✗ indicator as user types confirm password |
| 4 | No way to delete account | DELETE /api/auth/delete-account with "type DELETE" confirmation + password |
| 5 | Individual scores not in DB | `userScores[]` array saved per-user with their distraction-based score |
| 6 | No profile update option | PUT /api/auth/update-profile for username + password (requires current password) |
| 7 | No leave room option | 🚪 Leave Room button in navbar (warns if session active) |
| 8 | Only team score shown | Dashboard table shows Team Score + Your Score; result card shows individual breakdown |
| 9 | Multi-device = double count | `uniqueUsernames` Set deduplicates same user across multiple sockets |
| 10 | Timer in UTC | All dates displayed in IST (`Asia/Kolkata`); streak uses IST date |
| 11 | No session status | `completed: Boolean` field; dashboard filter: All / ✅ Completed / ⚠ Incomplete |
| 12 | Early exit = full score | Incomplete penalty: `(1 - completionRatio) × 30` pts subtracted from score |
| 13 | Username not sent to backend | `userName` included in every socket emit; `usernames[]` accurately populated |
| 14 | Client-side timer drifts | Server broadcasts `endTime`; clients recalculate `remaining = endTime - Date.now()` each tick |
| 15 | Result card showed stale score | `session_ended` payload includes `focusScore`, `userScores[]`, `completed` from server |
| 16 | Wrong data saved to MongoDB | `perUserDistractions` Map → accurate `userScores`; `completed` flag set correctly |

---

## 🔐 Password Policy

All passwords must meet:
- Minimum **8 characters**
- At least **1 uppercase** letter (A–Z)
- At least **1 number** (0–9)
- At least **1 special character** (`!@#$%^&*`)

Enforced on both client (real-time checklist + strength bar) and server.

---

## 📊 Focus Score Formula

**Completed session:**
```
focusScore = max(0, min(100, (100 - distractions × 10) + completionBonus))
completionBonus = round(completionRatio × 10)   // up to +10 pts
```

**Incomplete session (ended early):**
```
completionRatio = actualDurationSecs / plannedDurationSecs
incompletePenalty = round((1 - completionRatio) × 30)
focusScore = max(0, (100 - distractions × 10) - incompletePenalty)
```

---

## 🗄 MongoDB Notes

Default URI: `mongodb://localhost:27017/focussync_final`

To use Atlas, edit `server/config/db.js`:
```js
await mongoose.connect('YOUR_ATLAS_URI_HERE');
```

Leaderboard aggregation pipeline uses only **completed sessions** (`completed: true`) to rank users fairly.

---

## 🧪 Syllabus Concepts Demonstrated

- **HTML5**: Semantic tags, forms, form validation, Bootstrap 5 grid
- **CSS3**: Variables, box model, flexbox, grid, pseudo-classes, transitions, animations, media queries
- **JavaScript**: DOM manipulation, event handling, `XMLHttpRequest` (AJAX), `Date`, `setInterval`, `URLSearchParams`, `Blob` API, Web Audio API, Page Visibility API
- **Node.js**: `http`, `path`, static file serving
- **Express.js**: REST routing, middleware, sessions, cookies, GET/POST/PUT/DELETE handlers
- **MongoDB + Mongoose**: Schema, CRUD, virtuals, instance methods, static methods, pre-save hooks, aggregation pipeline
- **Socket.io**: Rooms, named events, bi-directional real-time sync
