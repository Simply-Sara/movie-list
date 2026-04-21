const { hashPassword, verifyPassword } = require('./auth');
const dbModule = require('../database');

async function createUser(username, password) {
  const db = dbModule.getDb();
  const hashedPassword = await hashPassword(password);
  const hashPart = hashedPassword.split('$2a$12$')[1] || '';
  const salt = hashPart.substring(0, 22);

  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)',
      [username, hashedPassword, salt],
      function(err) {
        if (err) {
          return reject(err);
        }
        resolve({ id: this.lastID, username });
      }
    );
  });
}

async function findUserByUsername(username) {
  const db = dbModule.getDb();
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM users WHERE LOWER(username) = LOWER(?)',
      [username],
      (err, row) => {
        if (err) return reject(err);
        resolve(row);
      }
    );
  });
}

async function getUserById(userId) {
  const db = dbModule.getDb();
  return new Promise((resolve, reject) => {
    db.get('SELECT id, username FROM users WHERE id = ?', [userId], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

async function updateUsername(userId, username) {
  const db = dbModule.getDb();
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET username = ? WHERE id = ?',
      [username, userId],
      function(err) {
        if (err) return reject(err);
        resolve({ changes: this.changes });
      }
    );
  });
}

async function updateUserPassword(userId, hashedPassword, salt) {
  const db = dbModule.getDb();
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET password_hash = ?, salt = ? WHERE id = ?',
      [hashedPassword, salt, userId],
      function(err) {
        if (err) return reject(err);
        resolve({ changes: this.changes });
      }
    );
  });
}

async function getAllUsers() {
  const db = dbModule.getDb();
  return new Promise((resolve, reject) => {
    db.all('SELECT id, username FROM users ORDER BY username', [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

module.exports = {
  createUser,
  findUserByUsername,
  getUserById,
  updateUsername,
  updateUserPassword,
  getAllUsers,
  hashPassword,
  verifyPassword
};
