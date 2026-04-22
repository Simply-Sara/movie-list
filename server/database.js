const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

let db = null;

function initDatabase(callback) {
  let dbPath;
  
  // Determine database path based on configuration priority
  if (process.env.DATABASE_PATH) {
    // Explicit configuration takes precedence
    dbPath = process.env.DATABASE_PATH;
    const dbDir = path.dirname(dbPath);
    try {
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
    } catch (err) {
      console.error(`Warning: Cannot create directory ${dbDir}: ${err.message}. Ensure it exists and is writable.`);
    }
  } else if (process.env.NODE_ENV === 'production') {
    // Default production location (Pterodactyl and other VPS)
    const dataDir = '/mnt/server/data';
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      dbPath = path.join(dataDir, 'movie_list.db');
    } catch (err) {
      // Fallback: if /mnt/server/data not accessible, use project-local ./data
      console.warn(`Warning: Cannot use ${dataDir} (${err.message}). Falling back to ./data/movie_list.db`);
      const fallbackDir = path.join(__dirname, '..', 'data'); // Project root/data
      try {
        if (!fs.existsSync(fallbackDir)) {
          fs.mkdirSync(fallbackDir, { recursive: true });
        }
        dbPath = path.join(fallbackDir, 'movie_list.db');
      } catch (fallbackErr) {
        console.error('Error: Cannot create fallback directory. Set DATABASE_PATH to a writable location.');
        return callback(fallbackErr);
      }
    }
  } else {
    // Development: store in server/ directory
    dbPath = path.join(__dirname, 'movie_list.db');
  }
  
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
      callback(err);
      return;
    }
    console.log('Connected to SQLite database at:', dbPath);
    
    db.serialize(() => {
      // Set busy timeout to avoid database locked errors
      db.run("PRAGMA busy_timeout = 5000"); // Wait up to 5s for locks
      createTables();
      ensureCaseInsensitiveUsernameUniqueness((err) => {
        if (err) {
          console.error('Database init failed:', err.message);
          callback(err);
        } else {
          console.log('Database initialization complete.');
          callback(null);
        }
      });
    });
  });
}

function createTables() {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      salt TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Media items table
  db.run(`
    CREATE TABLE IF NOT EXISTS media_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('movie', 'tv_show', 'anime')),
      tmdb_id INTEGER,
      tmdb_type TEXT,
      poster_path TEXT,
      release_date TEXT,
      overview TEXT,
      rating REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // User media status table
  db.run(`
    CREATE TABLE IF NOT EXISTS user_media_status (
      user_id INTEGER NOT NULL,
      media_id INTEGER NOT NULL,
      watch_status TEXT CHECK(watch_status IN ('want_to_watch', 'dont_want_to_watch', 'undecided')),
      seen INTEGER DEFAULT 0 CHECK(seen IN (0, 1)),
      PRIMARY KEY (user_id, media_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (media_id) REFERENCES media_items(id) ON DELETE CASCADE
    )
  `);

  // Add new columns to existing media_items table if they don't exist
  db.run(`ALTER TABLE media_items ADD COLUMN tmdb_id INTEGER`, () => {});
  db.run(`ALTER TABLE media_items ADD COLUMN tmdb_type TEXT`, () => {});
  db.run(`ALTER TABLE media_items ADD COLUMN poster_path TEXT`, () => {});
  db.run(`ALTER TABLE media_items ADD COLUMN release_date TEXT`, () => {});
  db.run(`ALTER TABLE media_items ADD COLUMN overview TEXT`, () => {});
  db.run(`ALTER TABLE media_items ADD COLUMN rating REAL`, () => {});
  
   // Add skipped column to user_media_status table if it doesn't exist
   db.run(`ALTER TABLE user_media_status ADD COLUMN skipped INTEGER DEFAULT 0 CHECK(skipped IN (0, 1))`, () => {});

   // Add password columns to users table if they don't exist (for existing installations)
   db.run(`ALTER TABLE users ADD COLUMN password_hash TEXT`, () => {});
   db.run(`ALTER TABLE users ADD COLUMN salt TEXT`, () => {});

   // Add new columns to users table (with error handling for existing columns)
   db.run(`ALTER TABLE users ADD COLUMN about_me TEXT`, (err) => {
     if (err && !err.message.includes('duplicate column')) console.error('Error adding about_me:', err.message);
   });
   db.run(`ALTER TABLE users ADD COLUMN profile_visibility TEXT DEFAULT 'public'`, (err) => {
     if (err && !err.message.includes('duplicate column')) console.error('Error adding profile_visibility:', err.message);
   });
   db.run(`ALTER TABLE users ADD COLUMN avatar_url TEXT`, (err) => {
     if (err && !err.message.includes('duplicate column')) console.error('Error adding avatar_url:', err.message);
   });

   // Add runtime column to media_items table
   db.run(`ALTER TABLE media_items ADD COLUMN runtime INTEGER`, (err) => {
     if (err && !err.message.includes('duplicate column')) console.error('Error adding runtime:', err.message);
   });

    // Create user_username_history table for audit tracking
    db.run(`
      CREATE TABLE IF NOT EXISTS user_username_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        old_username TEXT NOT NULL,
        changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    db.run(`CREATE INDEX IF NOT EXISTS idx_user_username_history_user_id ON user_username_history(user_id)`, () => {});

    // Create friendships table for friend relationships
    db.run(`
      CREATE TABLE IF NOT EXISTS friendships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        friend_id INTEGER NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('pending', 'accepted', 'blocked', 'rejected')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, friend_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    db.run(`CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id)`, () => {});
    db.run(`CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id)`, () => {});
    db.run(`CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status)`, () => {});
  }

function ensureCaseInsensitiveUsernameUniqueness(callback) {
  // Check for existing case-insensitive duplicates
  db.all(
    `SELECT LOWER(username) as lower_name, COUNT(*) as cnt, GROUP_CONCAT(username) as names
     FROM users
     GROUP BY lower_name
     HAVING cnt > 1`,
    (err, rows) => {
      if (err) return callback(err);
      if (rows.length > 0) {
        console.error('ERROR: Case-insensitive duplicate usernames exist:');
        rows.forEach(row => {
          console.error(`  "${row.lower_name}" => ${row.names}`);
        });
        return callback(new Error(
          'Cannot start: Resolve duplicate usernames that differ only by case (e.g., "SaRa" and "sara") before starting the server.'
        ));
      }
      // Create unique index on LOWER(username)
      const sql = `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username))`;
      db.run(sql, (err) => {
        if (err) return callback(err);
        console.log('Case-insensitive unique index on username is active.');
        callback(null);
      });
    }
  );
}

function getDb() {
  return db;
}

module.exports = { initDatabase, getDb };