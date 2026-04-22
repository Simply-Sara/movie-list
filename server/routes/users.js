const express = require('express');
const { getUserById, updateUsername, findUserByUsername, getAllUsers } = require('../utils/user');
const { requireAuth } = require('../middleware/auth');
const dbModule = require('../database');
const router = express.Router();

// GET /api/users - Get all users (id and username only)
router.get('/', async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (err) {
    console.error('Get all users error:', err);
    res.status(500).json({ error: 'Failed to get users', code: 'GET_USERS_FAILED' });
  }
});

// GET /api/users/profile - Get current user's profile (authenticated)
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const db = dbModule.getDb();
    
    db.get(
      `SELECT id, username, about_me, profile_visibility, avatar_url FROM users WHERE id = ?`,
      [userId],
      (err, row) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to get profile', code: 'GET_PROFILE_FAILED' });
        }
        if (!row) {
          return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
        }
        res.json(row);
      }
    );
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to get profile', code: 'GET_PROFILE_FAILED' });
  }
});

// PUT /api/users/profile - Update user profile (authenticated)
router.put('/profile', requireAuth, async (req, res) => {
  const { username, about_me, profile_visibility } = req.body;
  const userId = req.user.userId;

  const updates = [];
  const values = [];
  let shouldLogHistory = false;
  let oldUsername = null;

  // Validate about_me
  if (about_me !== undefined) {
    const trimmed = about_me.trim();
    if (trimmed.length > 500) {
      return res.status(400).json({ error: 'About me must be at most 500 characters', code: 'VALIDATION_ERROR' });
    }
    updates.push('about_me = ?');
    values.push(trimmed);
  }

  // Validate profile_visibility
  if (profile_visibility !== undefined) {
    const allowed = ['public', 'private', 'friends', 'group'];
    if (!allowed.includes(profile_visibility)) {
      return res.status(400).json({ error: 'Invalid profile visibility', code: 'VALIDATION_ERROR' });
    }
    updates.push('profile_visibility = ?');
    values.push(profile_visibility);
  }

  // Handle username separately (needs uniqueness check and history logging)
  if (username !== undefined) {
    const trimmed = username.trim();
    if (!trimmed) {
      return res.status(400).json({ error: 'Username cannot be empty', code: 'VALIDATION_ERROR' });
    }
    if (trimmed.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters', code: 'USERNAME_TOO_SHORT' });
    }
    if (trimmed.length > 30) {
      return res.status(400).json({ error: 'Username must be at most 30 characters', code: 'USERNAME_TOO_LONG' });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores', code: 'INVALID_USERNAME' });
    }

    const db = dbModule.getDb();
    // Fetch current user to get old username
    db.get('SELECT username FROM users WHERE id = ?', [userId], (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to update profile', code: 'UPDATE_PROFILE_FAILED' });
      }
      if (!row) {
        return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      }
      oldUsername = row.username;

      // If unchanged, skip uniqueness check and history
      if (oldUsername === trimmed) {
        // Still need to consider other fields; if none, early return
        if (updates.length === 0) {
          return res.status(400).json({ error: 'No fields to update', code: 'NO_UPDATES' });
        }
        // Execute without username change
        executeUpdate();
        return;
      }

      // Username is changing: check if new username is taken
      findUserByUsername(trimmed).then(existingUser => {
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ error: 'Update failed', code: 'UPDATE_FAILED' });
        }
        // OK to proceed
        updates.push('username = ?');
        values.push(trimmed);
        shouldLogHistory = true;
        executeUpdate();
      }).catch(err => {
        console.error('Username check error:', err);
        return res.status(500).json({ error: 'Failed to check username', code: 'CHECK_USERNAME_FAILED' });
      });
    });
    return; // early return; rest in callbacks
  }

  // No username change; just execute if there are other updates
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update', code: 'NO_UPDATES' });
  }
  executeUpdate();

  function executeUpdate() {
    const db = dbModule.getDb();
    values.push(userId);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;

    db.run(query, values, function(updateErr) {
      if (updateErr) {
        console.error('Update profile error:', updateErr);
        return res.status(500).json({ error: 'Failed to update profile', code: 'UPDATE_PROFILE_FAILED' });
      }

      // Log history after successful update, only if username changed
      if (this.changes > 0 && shouldLogHistory && oldUsername) {
        db.run(
          'INSERT INTO user_username_history (user_id, old_username) VALUES (?, ?)',
          [userId, oldUsername],
          (historyErr) => {
            if (historyErr) console.error('Error logging username history:', historyErr.message);
          }
        );
      }

      // Fetch updated user
      db.get(
        'SELECT id, username, about_me, profile_visibility, avatar_url FROM users WHERE id = ?',
        [userId],
        (fetchErr, row) => {
          if (fetchErr) {
            return res.status(500).json({ error: 'Failed to fetch updated profile', code: 'FETCH_FAILED' });
          }
          res.json({
            ...row,
            message: 'Profile updated successfully'
          });
        }
      );
    });
  }
});

// GET /api/users/username/:username - Get public profile by username
router.get('/username/:username', async (req, res) => {
  const { username } = req.params;
  const db = dbModule.getDb();

  // Find user by case-insensitive username
  db.get(
    'SELECT id, username, about_me, avatar_url, profile_visibility, created_at FROM users WHERE LOWER(username) = LOWER(?)',
    [username],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error', code: 'DB_ERROR' });
      }
      if (!user) {
        return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      }

      // Check privacy: if not public, only owner can view (via optional JWT)
      if (user.profile_visibility !== 'public') {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
        }
        const token = authHeader.substring(7);
        const jwt = require('jsonwebtoken');
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (decoded.userId !== user.id) {
            return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
          }
        } catch (e) {
          return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
        }
      }

      // Fetch stats
      db.get(`
        SELECT 
          COUNT(*) as total_media,
          COALESCE(SUM(CASE WHEN ums.seen = 1 THEN mi.runtime END), 0) as total_watch_time_minutes,
          COUNT(CASE WHEN ums.watch_status = 'want_to_watch' THEN 1 END) as want_to_watch,
          COUNT(CASE WHEN ums.watch_status = 'undecided' THEN 1 END) as undecided,
          COUNT(CASE WHEN ums.watch_status = 'dont_want_to_watch' THEN 1 END) as dont_want_to_watch,
          COUNT(CASE WHEN ums.seen = 1 THEN 1 END) as watched
        FROM user_media_status ums
        JOIN media_items mi ON ums.media_id = mi.id
        WHERE ums.user_id = ?
      `, [user.id], (statsErr, stats) => {
        if (statsErr) {
          return res.status(500).json({ error: 'Failed to fetch stats', code: 'STATS_ERROR' });
        }

        // Fetch user's media with status
        db.all(`
          SELECT m.id, m.title, m.type, m.poster_path, m.runtime,
                 ums.watch_status, ums.seen, ums.skipped
          FROM user_media_status ums
          JOIN media_items m ON ums.media_id = m.id
          WHERE ums.user_id = ?
          ORDER BY LOWER(m.title) ASC
        `, [user.id], (mediaErr, media) => {
          if (mediaErr) {
            return res.status(500).json({ error: 'Failed to fetch media', code: 'MEDIA_ERROR' });
          }

          res.json({
            id: user.id,
            username: user.username,
            about_me: user.about_me,
            avatar_url: user.avatar_url,
            profile_visibility: user.profile_visibility,
            created_at: user.created_at,
            stats: stats,
            media: media
          });
        });
      });
    }
  );
});

// GET /api/users/:userId - Get public profile by numeric ID (optional alternative)
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  const db = dbModule.getDb();

  if (isNaN(parseInt(userId))) {
    return res.status(400).json({ error: 'Invalid user ID', code: 'INVALID_ID' });
  }

  db.get(
    'SELECT id, username, about_me, avatar_url, profile_visibility, created_at FROM users WHERE id = ?',
    [userId],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error', code: 'DB_ERROR' });
      }
      if (!user) {
        return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      }

      // Privacy check (same as username route)
      if (user.profile_visibility !== 'public') {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
        }
        const token = authHeader.substring(7);
        const jwt = require('jsonwebtoken');
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (decoded.userId !== user.id) {
            return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
          }
        } catch (e) {
          return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
        }
      }

      // Stats and media (same logic)
      db.get(`
        SELECT 
          COUNT(*) as total_media,
          COALESCE(SUM(CASE WHEN ums.seen = 1 THEN mi.runtime END), 0) as total_watch_time_minutes,
          COUNT(CASE WHEN ums.watch_status = 'want_to_watch' THEN 1 END) as want_to_watch,
          COUNT(CASE WHEN ums.watch_status = 'undecided' THEN 1 END) as undecided,
          COUNT(CASE WHEN ums.watch_status = 'dont_want_to_watch' THEN 1 END) as dont_want_to_watch,
          COUNT(CASE WHEN ums.seen = 1 THEN 1 END) as watched
        FROM user_media_status ums
        JOIN media_items mi ON ums.media_id = mi.id
        WHERE ums.user_id = ?
      `, [user.id], (statsErr, stats) => {
        if (statsErr) {
          return res.status(500).json({ error: 'Failed to fetch stats', code: 'STATS_ERROR' });
        }

        db.all(`
          SELECT m.id, m.title, m.type, m.poster_path, m.runtime,
                 ums.watch_status, ums.seen, ums.skipped
          FROM user_media_status ums
          JOIN media_items m ON ums.media_id = m.id
          WHERE ums.user_id = ?
          ORDER BY LOWER(m.title) ASC
        `, [user.id], (mediaErr, media) => {
          if (mediaErr) {
            return res.status(500).json({ error: 'Failed to fetch media', code: 'MEDIA_ERROR' });
          }

          res.json({
            id: user.id,
            username: user.username,
            about_me: user.about_me,
            avatar_url: user.avatar_url,
            profile_visibility: user.profile_visibility,
            created_at: user.created_at,
            stats: stats,
            media: media
          });
        });
      });
    }
  );
});

module.exports = router;
