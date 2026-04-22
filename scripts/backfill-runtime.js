#!/usr/bin/env node

/**
 * Backfill runtime for media_items with NULL runtime.
 * Fetches details from TMDB using tmdb_id and tmdb_type, updates the runtime column.
 *
 * Usage: node scripts/backfill-runtime.js
 *
 * Requires TMDB_API_KEY in environment.
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

if (!TMDB_API_KEY) {
  console.error('❌ Error: TMDB_API_KEY is not set in environment variables.');
  process.exit(1);
}

// Resolve database path (same logic as server/database.js)
let dbPath;
if (process.env.DATABASE_PATH) {
  dbPath = process.env.DATABASE_PATH;
} else if (process.env.NODE_ENV === 'production') {
  const dataDir = '/mnt/server/data';
  try {
    const fs = require('fs');
    if (!require('fs').existsSync(dataDir)) {
      require('fs').mkdirSync(dataDir, { recursive: true });
    }
    dbPath = path.join(dataDir, 'movie_list.db');
  } catch (err) {
    const fallbackDir = path.join(__dirname, '..', 'server', 'data');
    try {
      if (!require('fs').existsSync(fallbackDir)) {
        require('fs').mkdirSync(fallbackDir, { recursive: true });
      }
      dbPath = path.join(fallbackDir, 'movie_list.db');
    } catch (fallbackErr) {
      console.error('Error: Cannot determine database path. Set DATABASE_PATH.');
      process.exit(1);
    }
  }
} else {
  dbPath = path.join(__dirname, '..', 'server', 'movie_list.db');
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to database:', dbPath);
  backfill();
});

async function fetchRuntimeFromTMDB(tmdbId, tmdbType) {
  const url = `${TMDB_BASE_URL}/${tmdbType}/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`TMDB ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    // For movies: data.runtime (minutes). For TV shows: data.episode_run_time[0] or data.runtime if available.
    let runtime = data.runtime;
    if (!runtime && data.episode_run_time && data.episode_run_time.length > 0) {
      runtime = data.episode_run_time[0];
    }
    return runtime || null;
  } catch (err) {
    console.error(`  ⚠️  TMDB error for ${tmdbType} ${tmdbId}: ${err.message}`);
    return null;
  }
}

function backfill() {
  db.all(
    `SELECT id, title, tmdb_id, tmdb_type FROM media_items WHERE runtime IS NULL OR runtime = 0`,
    (err, rows) => {
      if (err) {
        console.error('Error fetching items:', err.message);
        db.close();
        process.exit(1);
      }

      if (rows.length === 0) {
        console.log('✅ No items need runtime backfill. All done!');
        db.close();
        process.exit(0);
      }

      console.log(`🔍 Found ${rows.length} items with missing runtime. Starting backfill...`);

      let processed = 0;
      let updated = 0;
      let failed = 0;

      // Process sequentially to respect TMDB rate limits (slow but safe)
      async function processNext(index) {
        if (index >= rows.length) {
          console.log(`\n✅ Backfill complete: ${processed} processed, ${updated} updated, ${failed} failed.`);
          db.close();
          process.exit(0);
        }

        const item = rows[index];
        processed++;

        if (!item.tmdb_id || !item.tmdb_type) {
          console.log(`  [${index + 1}/${rows.length}] ❌ ${item.title}: No TMDB ID or type — skipping`);
          failed++;
          return processNext(index + 1);
        }

        console.log(`  [${index + 1}/${rows.length}] 🔍 Fetching ${item.title} (${item.tmdb_type} ${item.tmdb_id})...`);

        try {
          const runtime = await fetchRuntimeFromTMDB(item.tmdb_id, item.tmdb_type);

          if (runtime) {
            db.run(
              'UPDATE media_items SET runtime = ? WHERE id = ?',
              [runtime, item.id],
              (updateErr) => {
                if (updateErr) {
                  console.error(`  ❌ Update error for ${item.title}: ${updateErr.message}`);
                  failed++;
                } else {
                  console.log(`  ✅ ${item.title}: runtime = ${runtime} min`);
                  updated++;
                }
                // Wait ~200ms between requests to be gentle on TMDB rate limits
                setTimeout(() => processNext(index + 1), 200);
              }
            );
          } else {
            console.log(`  ⚠️  ${item.title}: No runtime found in TMDB`);
            failed++;
            setTimeout(() => processNext(index + 1), 200);
          }
        } catch (err) {
          console.error(`  ❌ Error processing ${item.title}: ${err.message}`);
          failed++;
          setTimeout(() => processNext(index + 1), 200);
        }
      }

      processNext(0);
    }
  );
}
