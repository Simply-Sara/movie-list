require('dotenv').config();
require('./config/env');
const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initDatabase, getDb } = require('./database');
const { requireAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// Health check endpoints
app.get('/healthz', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
});

app.get('/health', (req, res) => {
  const db = getDb();
  if (!db) {
    return res.status(503).json({ 
      status: 'starting', 
      error: 'Database not initialized yet',
      timestamp: new Date().toISOString()
    });
  }
  db.get("SELECT 1", (err) => {
    if (err) {
      return res.status(503).json({ 
        status: 'unhealthy', 
        error: 'Database query failed',
        timestamp: new Date().toISOString()
      });
    }
    res.status(200).json({ 
      status: 'healthy', 
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  });
});

// Trust proxy (for correct HTTPS detection behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware with CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Vite uses inline scripts
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://image.tmdb.org"],
      connectSrc: ["'self'", "https://api.themoviedb.org"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      frameSrc: ["'self'", "https://www.youtube.com", "https://www.youtube-nocookie.com"],
      frameAncestors: ["'none'"] // Prevent clickjacking
    }
  },
  xFrameOptions: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false
}));

// CORS configuration
const corsOptions = {
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Development: allow any origin (for Vite dev server on localhost:3000)
// Production: require explicit FRONTEND_URL (strict)
if (process.env.NODE_ENV === 'production') {
  if (!process.env.FRONTEND_URL) {
    console.error('❌ FRONTEND_URL is not set - CORS will reject all origins in production');
    process.exit(1);
  }
  corsOptions.origin = process.env.FRONTEND_URL;
} else {
  // Development mode: reflect request origin (allows localhost:3000, 127.0.0.1, etc.)
  corsOptions.origin = true;
}

app.use(cors(corsOptions));

// Global rate limiting: 1000 requests per 1 minutes per IP
app.use(rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded', code: 'RATE_LIMIT' }
}));

// Auth rate limiting: 5 attempts per 15 minutes per IP (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Try again later.', code: 'AUTH_RATE_LIMIT' }
});
app.use('/api/auth', authLimiter);

app.use(bodyParser.json());

// Initialize database and then register routes & start server
initDatabase((err) => {
  if (err) {
    process.exit(1);
    return;
  }

   // Auth routes
   const authRoutes = require('./routes/auth');
   app.use('/api/auth', authRoutes);

    // Users routes
    const usersRoutes = require('./routes/users');
    app.use('/api/users', usersRoutes);

    // Friends routes
    const friendsRoutes = require('./routes/friends');
    app.use('/api/friends', requireAuth, friendsRoutes);

    // Groups routes
    const groupsRoutes = require('./routes/groups');
    app.use('/api/groups', requireAuth, groupsRoutes);

  // Direct user creation endpoint (kept here for backward compatibility)
  const { findUserByUsername } = require('./utils/user');
  app.post('/api/users', async (req, res) => {
    const { username } = req.body;
    if (!username || username.trim() === '') {
      return res.status(400).json({ error: 'Username is required' });
    }

    const trimmedUsername = username.trim();

    try {
      const existingUser = await findUserByUsername(trimmedUsername);
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }
    } catch (err) {
      console.error('Check username error:', err);
      return res.status(500).json({ error: 'Failed to check username', code: 'CHECK_USERNAME_FAILED' });
    }

    const db = getDb();
    db.run('INSERT INTO users (username) VALUES (?)', [trimmedUsername], function(err) {
      if (err) {
        console.error('Insert user error:', err);
        if (err.message.includes('UNIQUE constraint')) {
          return res.status(400).json({ error: 'Username already exists' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, username: trimmedUsername });
    });
  });

  // TMDB search endpoint
  app.get('/api/tmdb/search', async (req, res) => {
    const { query } = req.query;

    if (!query || query.trim() === '') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    if (!TMDB_API_KEY) {
      return res.status(500).json({ error: 'TMDB API key not configured' });
    }

    try {
      const searchTypes = ['movie', 'tv'];
      const results = [];
      for (const searchType of searchTypes) {
        const response = await fetch(
          `${TMDB_BASE_URL}/search/${searchType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1`
        );

        if (!response.ok) {
          throw new Error(`TMDB API error: ${response.statusText}`);
        }

        const data = await response.json();
        const items = data.results.map(item => ({
          id: item.id,
          title: searchType === 'movie' ? item.title : item.name,
          type: searchType === 'movie' ? 'movie' : 'tv_show',
          tmdb_type: searchType,
          poster_path: item.poster_path,
          release_date: searchType === 'movie' ? item.release_date : item.first_air_date,
          overview: item.overview,
          rating: item.vote_average,
          popularity: item.popularity || 0
        }));
        results.push(...items);
      }

      const uniqueResults = results.reduce((acc, item) => {
        const key = `${item.tmdb_type}-${item.id}`;
        if (!acc[key]) {
          acc[key] = item;
        }
        return acc;
      }, {});

      const sortedResults = Object.values(uniqueResults).sort((a, b) => b.popularity - a.popularity);
      res.json(sortedResults.slice(0, 20));
    } catch (error) {
      console.error('TMDB search error:', error);
      res.status(500).json({ error: error.message });
    }
  });

   // Media item routes
   app.get('/api/media', (req, res) => {
     const db = getDb();
     db.all(`
       SELECT
         m.id,
         m.title,
         m.type,
         m.tmdb_id,
         m.tmdb_type,
         m.poster_path,
         m.release_date,
         m.overview,
         m.rating,
         m.runtime,
         m.genres,
         m.created_at
       FROM media_items m
       INNER JOIN user_media_status ums ON m.id = ums.media_id
       WHERE ums.watch_status IS NOT NULL OR ums.seen = 1
       GROUP BY m.id
       ORDER BY m.created_at DESC
     `, (err, rows) => {
       if (err) {
         return res.status(500).json({ error: err.message });
       }
       // Parse genres JSON for each row
       const parsedRows = rows.map(row => ({
         ...row,
         genres: row.genres ? JSON.parse(row.genres) : []
        }));
        res.json(parsedRows);
      });
    });

    // Check if media exists by TMDB ID
   app.get('/api/media/by-tmdb', (req, res) => {
     const { tmdb_id, tmdb_type } = req.query;

     if (!tmdb_id || !tmdb_type) {
       return res.status(400).json({ error: 'tmdb_id and tmdb_type are required' });
     }

     const db = getDb();
     db.get(
       `SELECT * FROM media_items WHERE tmdb_id = ? AND tmdb_type = ?`,
       [tmdb_id, tmdb_type],
       (err, row) => {
         if (err) {
           return res.status(500).json({ error: err.message });
         }
         if (row) {
           db.all(`
             SELECT
               ums.user_id,
               u.username,
               ums.watch_status,
               ums.seen
             FROM user_media_status ums
             JOIN users u ON ums.user_id = u.id
             WHERE ums.media_id = ?
               AND (ums.watch_status IS NOT NULL OR ums.seen = 1)
           `, [row.id], (statusErr, statuses) => {
             if (statusErr) {
               return res.status(500).json({ error: statusErr.message });
             }
             res.json({
               ...row,
               genres: row.genres ? JSON.parse(row.genres) : [],
               userStatuses: statuses || []
             });
           });
         } else {
           res.json(null);
         }
       }
     );
   });

   app.post('/api/media', (req, res) => {
     const { title, type, tmdb_id, tmdb_type, poster_path, release_date, overview, rating, runtime, genres } = req.body;
     if (!title || title.trim() === '') {
       return res.status(400).json({ error: 'Title is required' });
     }
     if (!['movie', 'tv_show', 'anime'].includes(type)) {
       return res.status(400).json({ error: 'Type must be movie, tv_show, or anime' });
     }

     const db = getDb();

     if (tmdb_id && tmdb_type) {
       db.get(
         `SELECT * FROM media_items WHERE tmdb_id = ? AND tmdb_type = ?`,
         [tmdb_id, tmdb_type],
         (err, existingItem) => {
           if (err) {
             return res.status(500).json({ error: err.message });
           }

           if (existingItem) {
             return res.status(409).json({
               error: 'This item already exists in the list',
               existingItem: existingItem
             });
           }

           insertMediaItem();
         }
       );
     } else {
       insertMediaItem();
     }

     function insertMediaItem() {
       db.run(
         `INSERT INTO media_items (title, type, tmdb_id, tmdb_type, poster_path, release_date, overview, rating, runtime, genres)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
         [
           title.trim(),
           type,
           tmdb_id || null,
           tmdb_type || null,
           poster_path || null,
           release_date || null,
           overview || null,
           rating || null,
           runtime || null,
           genres ? JSON.stringify(genres) : null
         ],
         function(err) {
           if (err) {
             return res.status(500).json({ error: err.message });
           }
           res.json({
             id: this.lastID,
             title: title.trim(),
             type,
             tmdb_id: tmdb_id || null,
             tmdb_type: tmdb_type || null,
             poster_path: poster_path || null,
             release_date: release_date || null,
             overview: overview || null,
             rating: rating || null,
             runtime: runtime || null,
             genres: genres || null,
             created_at: new Date().toISOString()
           });
         }
       );
     }
   });

  app.delete('/api/media/:mediaId', (req, res) => {
    const { mediaId } = req.params;
    const db = getDb();

    db.run('DELETE FROM media_items WHERE id = ?', [mediaId], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Media item not found' });
      }
      res.json({ success: true });
    });
  });

  // User media status routes
  app.get('/api/media/:mediaId/status', (req, res) => {
    const { mediaId } = req.params;
    const db = getDb();
    db.all(`
      SELECT
        ums.user_id,
        u.username,
        ums.watch_status,
        ums.seen
      FROM user_media_status ums
      JOIN users u ON ums.user_id = u.id
      WHERE ums.media_id = ?
        AND (ums.watch_status IS NOT NULL OR ums.seen = 1)
    `, [mediaId], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
  });

  app.post('/api/media/:mediaId/status', requireAuth, (req, res) => {
    const { mediaId } = req.params;
    const { watchStatus, seen } = req.body;
    const userId = req.user.userId;

    if (watchStatus !== null && watchStatus !== undefined && !['want_to_watch', 'dont_want_to_watch', 'undecided'].includes(watchStatus)) {
      return res.status(400).json({ error: 'Invalid watch status' });
    }

    const db = getDb();
    db.get(
      'SELECT * FROM user_media_status WHERE user_id = ? AND media_id = ?',
      [userId, mediaId],
      (err, row) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (row) {
          const newWatchStatus = watchStatus !== undefined ? watchStatus : row.watch_status;
          const newSeen = seen !== undefined ? (seen ? 1 : 0) : row.seen;

          db.run(
            'UPDATE user_media_status SET watch_status = ?, seen = ? WHERE user_id = ? AND media_id = ?',
            [newWatchStatus, newSeen, userId, mediaId],
            function(updateErr) {
              if (updateErr) {
                return res.status(500).json({ error: updateErr.message });
              }
              res.json({ success: true });
            }
          );
        } else {
          const statusToInsert = watchStatus !== undefined ? watchStatus : null;
          db.run(
            'INSERT INTO user_media_status (user_id, media_id, watch_status, seen) VALUES (?, ?, ?, ?)',
            [userId, mediaId, statusToInsert, seen ? 1 : 0],
            function(insertErr) {
              if (insertErr) {
                return res.status(500).json({ error: insertErr.message });
              }
              res.json({ success: true });
            }
          );
        }
      }
    );
  });

  app.post('/api/media/:mediaId/mark-watched', requireAuth, (req, res) => {
    const { mediaId } = req.params;
    const userId = req.user.userId;
    const db = getDb();

    db.run(
      `INSERT OR IGNORE INTO user_media_status (user_id, media_id, seen, watch_status)
       VALUES (?, ?, 1, NULL)`,
      [userId, mediaId],
      function(insertErr) {
        if (insertErr) {
          return res.status(500).json({ error: insertErr.message });
        }

        db.run(
          `UPDATE user_media_status
           SET seen = 1, watch_status = NULL
           WHERE media_id = ? AND user_id = ?`,
          [mediaId, userId],
          function(updateErr) {
            if (updateErr) {
              return res.status(500).json({ error: updateErr.message });
            }
            res.json({
              success: true,
              updatedCount: this.changes
            });
          }
        );
      }
    );
  });

    app.post('/api/media/filter', requireAuth, (req, res) => {
      const { userIds = [], watchStatus, type, genres, runtimeMin, runtimeMax } = req.body;

      const db = getDb();

      if (Array.isArray(userIds) && userIds.length > 0) {
        const placeholders = userIds.map(() => '?').join(',');

        let query = `
          SELECT
            m.id,
            m.title,
            m.type,
            m.tmdb_id,
            m.tmdb_type,
            m.poster_path,
            m.release_date,
            m.overview,
            m.rating,
            m.runtime,
            m.genres,
            m.created_at,
            GROUP_CONCAT(u.username) as users,
            GROUP_CONCAT(ums.watch_status) as watch_statuses,
            GROUP_CONCAT(ums.seen) as seen_flags
          FROM media_items m
          JOIN user_media_status ums ON m.id = ums.media_id
          JOIN users u ON ums.user_id = u.id
          WHERE ums.user_id IN (${placeholders})
        `;

        const params = [...userIds];

        if (watchStatus) {
          query += ' AND ums.watch_status = ?';
          params.push(watchStatus);
        }

        if (type) {
          query += ' AND m.type = ?';
          params.push(type);
        }

        if (runtimeMin !== null && runtimeMin !== undefined && runtimeMin !== '') {
          query += ' AND m.runtime >= ?';
          params.push(parseInt(runtimeMin, 10));
        }

        if (runtimeMax !== null && runtimeMax !== undefined && runtimeMax !== '') {
          query += ' AND m.runtime <= ?';
          params.push(parseInt(runtimeMax, 10));
        }

        if (Array.isArray(genres) && genres.length > 0) {
          genres.forEach(genre => {
            query += ' AND m.genres LIKE ?';
            params.push(`%"${genre}"%`);
          });
        }

        query += `
          GROUP BY m.id
          HAVING COUNT(DISTINCT ums.user_id) = ?
          ORDER BY m.created_at DESC
        `;
        params.push(userIds.length);

        db.all(query, params, (err, rows) => {
          if (err) {
            console.error('Filter query error:', err.message, 'Query:', query);
            return res.status(500).json({ error: err.message });
          }
          const parsedRows = rows.map(row => ({
            ...row,
            genres: row.genres ? JSON.parse(row.genres) : []
          }));
          res.json(parsedRows);
        });

      } else {
        let query = `
          SELECT
            m.id,
            m.title,
            m.type,
            m.tmdb_id,
            m.tmdb_type,
            m.poster_path,
            m.release_date,
            m.overview,
            m.rating,
            m.runtime,
            m.genres,
            m.created_at
          FROM media_items m
          WHERE 1=1
        `;

        const params = [];

        if (type) {
          query += ' AND m.type = ?';
          params.push(type);
        }

        if (runtimeMin !== null && runtimeMin !== undefined && runtimeMin !== '') {
          query += ' AND m.runtime >= ?';
          params.push(parseInt(runtimeMin, 10));
        }

        if (runtimeMax !== null && runtimeMax !== undefined && runtimeMax !== '') {
          query += ' AND m.runtime <= ?';
          params.push(parseInt(runtimeMax, 10));
        }

        if (Array.isArray(genres) && genres.length > 0) {
          genres.forEach(genre => {
            query += ' AND m.genres LIKE ?';
            params.push(`%"${genre}"%`);
          });
        }

        query += ' ORDER BY m.created_at DESC';

        db.all(query, params, (err, rows) => {
          if (err) {
            console.error('Filter query error:', err.message);
            return res.status(500).json({ error: err.message });
          }
          const parsedRows = rows.map(row => ({
            ...row,
            genres: row.genres ? JSON.parse(row.genres) : []
          }));
          res.json(parsedRows);
        });
      }
    });

  // Fetch full details from TMDB
  app.get('/api/tmdb/details', async (req, res) => {
    const { tmdb_id, tmdb_type } = req.query;

    if (!tmdb_id || !tmdb_type) {
      return res.status(400).json({ error: 'tmdb_id and tmdb_type are required' });
    }

    if (!TMDB_API_KEY) {
      return res.status(500).json({ error: 'TMDB API key not configured' });
    }

    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/${tmdb_type}/${tmdb_id}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=credits,videos`
      );

      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.statusText}`);
      }

      const data = await response.json();

      const formattedData = {
        id: data.id,
        title: tmdb_type === 'movie' ? data.title : data.name,
        original_title: tmdb_type === 'movie' ? data.original_title : data.original_name,
        type: tmdb_type === 'movie' ? 'movie' : 'tv_show',
        tmdb_type: tmdb_type,
        poster_path: data.poster_path,
        backdrop_path: data.backdrop_path,
        release_date: tmdb_type === 'movie' ? data.release_date : data.first_air_date,
        overview: data.overview,
        rating: data.vote_average,
        vote_count: data.vote_count,
        popularity: data.popularity,
        genres: data.genres || [],
        runtime: data.runtime || (data.episode_run_time && data.episode_run_time[0]) || null,
        status: data.status,
        tagline: data.tagline || null,
        budget: data.budget || null,
        revenue: data.revenue || null,
        production_companies: data.production_companies || [],
        production_countries: data.production_countries || [],
        spoken_languages: data.spoken_languages || [],
        homepage: data.homepage || null,
        imdb_id: data.imdb_id || null,
        number_of_seasons: data.number_of_seasons || null,
        number_of_episodes: data.number_of_episodes || null,
        first_air_date: data.first_air_date || null,
        last_air_date: data.last_air_date || null,
        cast: data.credits?.cast?.slice(0, 10) || [],
        crew: data.credits?.crew?.filter(c => ['Director', 'Producer', 'Writer', 'Screenplay'].includes(c.job)) || [],
        videos: data.videos?.results?.filter(v => v.type === 'Trailer' || v.type === 'Teaser') || []
      };

      res.json(formattedData);
    } catch (error) {
      console.error('TMDB details error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Export TMDB image base URL for frontend use
  app.get('/api/tmdb/config', (req, res) => {
    res.json({ imageBaseUrl: TMDB_IMAGE_BASE_URL });
  });

  // Queue endpoints
  app.get('/api/queue/:userId', requireAuth, (req, res) => {
    const { userId } = req.params;
    const requestingUserId = req.user.userId;

    if (userId !== requestingUserId.toString()) {
      return res.status(403).json({ error: 'Unauthorized', code: 'FORBIDDEN' });
    }

    const db = getDb();
    db.all(`
      SELECT DISTINCT
        m.id,
        m.title,
        m.type,
        m.tmdb_id,
        m.tmdb_type,
        m.poster_path,
        m.release_date,
        m.overview,
        m.rating,
        m.created_at,
        COALESCE(ums_current.watch_status, NULL) as current_user_status,
        COALESCE(ums_current.seen, 0) as current_user_seen,
        COALESCE(ums_current.skipped, 0) as current_user_skipped,
        (SELECT COUNT(*)
         FROM user_media_status ums2
         WHERE ums2.media_id = m.id
         AND ums2.watch_status = 'want_to_watch'
         AND (ums2.skipped = 0 OR ums2.skipped IS NULL)
         ) as want_count
      FROM media_items m
      INNER JOIN user_media_status ums_any ON m.id = ums_any.media_id
        AND ums_any.watch_status = 'want_to_watch'
        AND (ums_any.skipped = 0 OR ums_any.skipped IS NULL)
      LEFT JOIN user_media_status ums_current ON m.id = ums_current.media_id AND ums_current.user_id = ?
      WHERE (ums_current.watch_status IS NULL OR ums_current.watch_status = 'undecided')
      GROUP BY m.id
      ORDER BY
        CASE
          WHEN ums_current.watch_status IS NULL THEN 1
          WHEN ums_current.watch_status = 'undecided' THEN 2
          ELSE 3
        END,
        COALESCE(ums_current.skipped, 0) ASC,
        want_count DESC,
        m.rating DESC,
        m.created_at DESC
    `, [userId], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
  });

  app.post('/api/queue/:userId/skip', requireAuth, (req, res) => {
    const { userId } = req.params;
    const requestingUserId = req.user.userId;
    const { mediaId } = req.body;

    if (userId !== requestingUserId.toString()) {
      return res.status(403).json({ error: 'Unauthorized', code: 'FORBIDDEN' });
    }

    if (!mediaId) {
      return res.status(400).json({ error: 'Media ID is required' });
    }

    const db = getDb();
    db.get(
      'SELECT * FROM user_media_status WHERE user_id = ? AND media_id = ?',
      [userId, mediaId],
      (err, row) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (row) {
          db.run(
            'UPDATE user_media_status SET skipped = 1 WHERE user_id = ? AND media_id = ?',
            [userId, mediaId],
            function(updateErr) {
              if (updateErr) {
                return res.status(500).json({ error: updateErr.message });
              }
              res.json({ success: true });
            }
          );
        } else {
          db.run(
            'INSERT INTO user_media_status (user_id, media_id, skipped) VALUES (?, ?, 1)',
            [userId, mediaId],
            function(insertErr) {
              if (insertErr) {
                return res.status(500).json({ error: insertErr.message });
              }
              res.json({ success: true });
            }
          );
        }
      }
    );
  });

  // Global error handler (must be after all routes)
  app.use((err, req, res, next) => {
    console.error(`[${new Date().toISOString()}]`, err);
    
    const status = err.status || 500;
    const code = err.code || 'INTERNAL_ERROR';
    const message = process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message;
    
    res.status(status).json({ error: message, code });
  });

  // Serve React frontend in production (catch-all, after API routes)
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
    
    // All non-API routes return React app (for client-side routing)
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
      }
    });
  }

  // Start server only after all routes are registered and DB is ready
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`Accessible on your network at http://<your-ip>:${PORT}`);
    if (!TMDB_API_KEY) {
      console.warn('Warning: TMDB_API_KEY not found in environment variables');
    }
  });

  // Graceful shutdown handler
  function gracefulShutdown() {
    console.log('\nShutting down gracefully...');
    server.close(() => {
      console.log('HTTP server closed');
      const db = getDb();
      if (db) {
        db.close((err) => {
          if (err) console.error('Error closing database:', err.message);
          else console.log('Database connection closed');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    });
    
    // Force exit after 10 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  }

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
  process.on('SIGUSR2', gracefulShutdown); // nodemon restart
});
