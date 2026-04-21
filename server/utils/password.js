const { verifyPassword } = require('./auth');
const dbModule = require('../database');

async function getUserPasswordHash(userId) {
  const db = dbModule.getDb();
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row ? row.password_hash : null);
      }
    );
  });
}

async function checkPassword(userId, password) {
  const hash = await getUserPasswordHash(userId);
  if (!hash) return null;
  const match = await verifyPassword(password, hash);
  return match ? hash : null;
}

module.exports = {
  getUserPasswordHash,
  checkPassword
};
