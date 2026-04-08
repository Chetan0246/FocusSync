# FocusSync

Real-time collaborative study platform demonstrating web development concepts.

## Features

- **Real-time Sync**: Server-controlled timer visible to all users
- **Late Join Support**: New users sync to remaining session time
- **Distraction Detection**: Page Visibility API tracks when users leave the tab
- **Analytics Dashboard**: View sessions, leaderboard, and heatmaps
- **Focus Score**: Calculated based on distraction count

## 📚 Syllabus Topics Covered

### CO1: Web Essentials (HTML5/CSS3)
| Topic | Implementation |
|-------|---------------|
| HTML5 Semantic Tags | `<nav>`, `<main>` in all pages |
| CSS3 Selectors | Class, ID, attribute selectors |
| CSS Variables | `--primary`, `--bg-dark` in :root |
| Flexbox | `display: flex` in cards, nav |
| CSS Grid | Heatmap, dashboard layouts |
| Box Model | Padding, margin, border |
| Animations | `@keyframes` in App.css |
| Gradients | Buttons, backgrounds |
| Responsive Design | Media queries |

### CO2: Client-side Scripting (JavaScript)
| Topic | Implementation |
|-------|---------------|
| Variables & Functions | Throughout codebase |
| Events | onClick, onChange, socket |
| DOM Manipulation | React JSX |
| Timing | setInterval in Timer |
| Form Validation | Login/Signup forms |

### CO3: Client/Server Communication
| Topic | Implementation |
|-------|---------------|
| HTTP Methods | GET, POST API calls |
| REST APIs | /api/auth, /api/analytics |
| JSON | API request/response |
| AJAX | axios for API calls |

### CO4: Server-side Development (Node.js/Express)
| Topic | Implementation |
|-------|---------------|
| Node.js Basics | require, module system |
| Express Setup | Server, middleware |
| Routing | API endpoints |
| Request/Response | req.body, res.json() |
| MongoDB | Mongoose models |

### CO5: Component-based Frontend (React)
| Topic | Implementation |
|-------|---------------|
| Functional Components | All components |
| useState Hook | Timer, forms |
| useEffect Hook | API calls, socket |
| React Router | Navigation |
| Context API | AuthContext |

## Project Structure

```
FocusSync/
├── client/                    # React Frontend
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   │   ├── Navbar.jsx
│   │   │   ├── Timer.jsx
│   │   │   ├── Toast.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── context/         # React Context
│   │   │   └── AuthContext.jsx
│   │   ├── pages/           # Page components
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   ├── Home.jsx
│   │   │   ├── Room.jsx
│   │   │   └── Dashboard.jsx
│   │   ├── App.jsx         # Main component
│   │   └── App.css         # Styles
│   └── package.json
│
├── server/                   # Node.js Backend
│   ├── config/
│   │   └── db.js           # MongoDB connection
│   ├── models/
│   │   ├── User.js         # User model
│   │   └── Session.js       # Session model
│   ├── routes/
│   │   ├── auth.js         # Auth routes
│   │   └── analytics.js    # Analytics routes
│   ├── middleware/
│   │   └── auth.js         # JWT middleware
│   └── index.js           # Server entry
│
└── README.md
```

## Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (locally or Atlas)

### Backend
```bash
cd server
npm install
npm start
```
Server: http://localhost:5000

### Frontend
```bash
cd client
npm install
npm start
```
App: http://localhost:3000

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/analytics/all` | All sessions |
| GET | `/api/analytics/:roomId` | Room sessions |
| GET | `/api/leaderboard` | Top rooms |
| GET | `/api/heatmap` | Activity data |

## Socket.io Events

### Client → Server
- `join_room` - Join study room
- `start_session` - Start focus session
- `distraction` - Report distraction
- `end_session` - End session

### Server → Client
- `user_count` - Online users
- `session_started` - Session started
- `session_sync` - Sync remaining time
- `session_ended` - Session ended

## Technologies

- **Frontend**: React, React Router, Socket.io Client, Axios
- **Backend**: Node.js, Express, Socket.io, MongoDB (Mongoose)
- **Styling**: Custom CSS (Dark theme)

## License

MIT
