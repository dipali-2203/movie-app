# 🎬 CineMatch

A full-stack movie discovery and watchlist app. Search for movies, get mood-based recommendations, and save your favourites — all with a personal account.

**Live demo:** [cinematchrecs.netlify.app](https://cinematchrecs.netlify.app)

---

## Features

- 🔍 **Search** — find movies by title, powered by TMDB
- 🎭 **Mood-based recommendations** — filter picks by your current vibe
- 📋 **Watchlist** — save movies to your personal list (requires login)
- ❤️ **Favourites** — mark watchlist items as favourites
- 🔐 **Auth** — sign up / log in with JWT-based authentication
- 💀 **Skeleton loading** — smooth loading states throughout

---

## Tech Stack

### Frontend
- Vanilla JavaScript, HTML, CSS
- Hosted on **Netlify**

### Backend
- **Node.js** + **Express**
- **MongoDB** + **Mongoose**
- **JWT** (jsonwebtoken) for auth
- **bcryptjs** for password hashing
- **TMDB API** for movie data
- Hosted on **Render**

---

## Project Structure

```
movie-app/
├── frontend/
│   ├── index.html       # Main HTML
│   ├── app.js           # All frontend logic
│   └── style.css        # Styles
├── backend/
│   ├── server.js        # Express entry point
│   ├── middleware/
│   │   └── auth.js      # JWT verification middleware
│   ├── models/
│   │   ├── User.js      # User schema
│   │   └── Watchlist.js # Watchlist schema
│   ├── routes/
│   │   ├── auth.js      # /api/auth (login, signup, /me)
│   │   ├── movies.js    # /api/movies (search, recommend, details)
│   │   └── watchlist.js # /api/watchlist (CRUD)
│   ├── package.json
│   └── package-lock.json
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js v18+
- A MongoDB connection string (e.g. MongoDB Atlas)
- A free [TMDB API key](https://www.themoviedb.org/settings/api)

### Backend

```bash
cd backend
npm install
```

Create a `.env` file in `/backend`:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
TMDB_API_KEY=your_tmdb_api_key
PORT=5000
```

```bash
node server.js
```

The API will be running at `http://localhost:5000`.

### Frontend

Open `frontend/index.html` in your browser, or serve it with any static server:

```bash
npx serve frontend
```

> Make sure the `API` variable in your frontend JS points to your local backend: `http://localhost:5000/api`

---

## API Endpoints

| Method | Endpoint | Description | Auth required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/signup` | Create account | No |
| POST | `/api/auth/login` | Log in | No |
| GET | `/api/auth/me` | Get current user | Yes |
| GET | `/api/movies/search?q=` | Search movies | No |
| GET | `/api/movies/recommend?page=&mood=` | Get recommendations | No |
| GET | `/api/movies/details/:id` | Get movie details | No |
| GET | `/api/watchlist` | Get user's watchlist | Yes |
| POST | `/api/watchlist` | Add movie to watchlist | Yes |
| PUT | `/api/watchlist/:id` | Toggle favourite | Yes |
| DELETE | `/api/watchlist/:id` | Remove from watchlist | Yes |

---

## Deployment

- **Frontend** is deployed on Netlify (drag & drop the `frontend` folder or connect the repo)
- **Backend** is deployed on Render (connect the repo and set environment variables in the Render dashboard)

---

## Acknowledgements

Movie data provided by [TMDB](https://www.themoviedb.org/).

> This product uses the TMDB API but is not endorsed or certified by TMDB.
