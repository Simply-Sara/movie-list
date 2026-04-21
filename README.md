# Movie List

A shared movie watchlist application for coordinating movie nights with friends and family. Track movies you want to watch, mark what you've seen, and build a queue based on group interest.

## Features

- User registration and authentication
- Search and add movies/TV shows from TMDB
- Mark movies as watched or want-to-watch
- Collaborative queue system showing what others want to watch
- Filter media by user and watch status
- Change password functionality
- Responsive Tailwind CSS UI

## Tech Stack

**Backend:**
- Node.js with Express
- SQLite database
- JWT authentication
- bcrypt password hashing
- Helmet security middleware

**Frontend:**
- React 18 with React Router
- Vite build tool
- Tailwind CSS

**External APIs:**
- TMDB (The Movie Database) API

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- TMDB API key (free from https://www.themoviedb.org/settings/api)

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd movie-list
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your TMDB API key:
   ```
   TMDB_API_KEY=your_key_here
   JWT_SECRET=your-strong-secret-here
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   ```

4. **Run in development**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000` (frontend) and `http://localhost:3001` (backend API).

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TMDB_API_KEY` | Your TMDB API key | Yes |
| `JWT_SECRET` | Secret for JWT token signing (min 32 chars) | Yes |
| `NODE_ENV` | `development` or `production` | Yes |
| `FRONTEND_URL` | Frontend origin URL for CORS | Yes (prod) |
| `PORT` | Server port (default: 3001) | No |
| `DATABASE_PATH` | Custom database file path | No |

## Building for Production

1. **Build the frontend**
   ```bash
   npm run build
   ```

2. **Start the server**
   ```bash
   npm start
   ```
   
   Or for production with PM2:
   ```bash
   pm2 start ecosystem.config.js
   ```

The server will serve the built React frontend from `client/dist/`.
movie-list/
├── server/
│   ├── config/          # Environment configuration
│   ├── middleware/      # Express middleware (auth)
│   ├── routes/          # API route handlers
│   │   └── auth/        # Authentication endpoints
│   ├── utils/           # Helper functions
│   ├── database.js      # SQLite setup & migrations
│   └── index.js         # Express app entry point
├── client/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page-level components
│   │   ├── App.jsx      # Main app component
│   │   └── main.jsx     # React entry point
│   ├── index.html
│   ├── vite.config.js
│   └── tailwind.config.js
├── data/                # Database storage (dev)
├── start.sh             # Simple start script
├── .env.example         # Environment template
└── package.json         # Root dependencies
```



## License

MIT

## Acknowledgments

- TMDB for providing movie data
- Built with Express, React, and Tailwind CSS
