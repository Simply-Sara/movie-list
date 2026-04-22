const dbModule = require('../database');

function getDb() {
  return dbModule.getDb();
}

// Get all friends (accepted status) for a user
function getFriends(userId) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    // Find all friendships where userId is either user_id or friend_id and status='accepted'
    const sql = `
      SELECT DISTINCT u.id, u.username, u.about_me, u.profile_visibility, u.avatar_url, u.created_at
      FROM friendships f
      JOIN users u ON (
        (f.user_id = ? AND f.friend_id = u.id) OR
        (f.friend_id = ? AND f.user_id = u.id)
      )
      WHERE f.status = 'accepted'
        AND (f.user_id = ? OR f.friend_id = ?)
    `;
    db.all(sql, [userId, userId, userId, userId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// Get pending incoming friend requests (where user is the recipient)
function getIncomingRequests(userId) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    // Requests where friend_id = current user (received) AND status = 'pending'
    const sql = `
      SELECT u.id, u.username, u.about_me, u.avatar_url, u.created_at, f.id as friendship_id, f.created_at as request_sent_at
      FROM friendships f
      JOIN users u ON f.user_id = u.id
      WHERE f.friend_id = ? AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `;
    db.all(sql, [userId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// Get pending outgoing friend requests (where user is the sender)
function getOutgoingRequests(userId) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    // Requests where user_id = current user (sent) AND status = 'pending'
    const sql = `
      SELECT u.id, u.username, u.about_me, u.avatar_url, u.created_at, f.id as friendship_id, f.created_at as request_sent_at
      FROM friendships f
      JOIN users u ON f.friend_id = u.id
      WHERE f.user_id = ? AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `;
    db.all(sql, [userId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// Send a friend request from senderId to recipientUsername
function sendFriendRequest(senderId, recipientUsername) {
  const db = getDb();
  
  return new Promise((resolve, reject) => {
    // Lookup recipient
    db.get(
      'SELECT id, username FROM users WHERE LOWER(username) = LOWER(?)',
      [recipientUsername],
      (err, recipient) => {
        if (err) return reject(err);
        if (!recipient) {
          return reject(new Error('User not found'));
        }

        const recipientId = recipient.id;

        // Prevent self-friendship
        if (senderId === recipientId) {
          return reject(new Error('Cannot send friend request to yourself'));
        }

        // Check for existing relationship (either direction) in any relevant status
        const checkSql = `
          SELECT status FROM friendships
          WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
        `;
        db.get(checkSql, [senderId, recipientId, recipientId, senderId], (checkErr, existing) => {
          if (checkErr) return reject(checkErr);
          if (existing) {
            if (existing.status === 'accepted') {
              return reject(new Error('Already friends'));
            } else if (existing.status === 'pending') {
              // Determine which direction the pending exists
              // If original (sender, recipient, pending) already exists, it's your pending
              // If (recipient, sender, pending) exists, they already sent you a request
              return reject(new Error('Friend request already sent or pending'));
            } else if (existing.status === 'blocked') {
              return reject(new Error('Cannot send friend request: blocked'));
            } else if (existing.status === 'rejected') {
              // Allow re-sending after rejection; we'll delete old and insert new
              const deleteOld = `
                DELETE FROM friendships
                WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
              `;
              db.run(deleteOld, [senderId, recipientId, recipientId, senderId], (delErr) => {
                if (delErr) return reject(delErr);
                insertPending();
              });
              return;
            }
          }
          insertPending();

          function insertPending() {
            const insertSql = 'INSERT INTO friendships (user_id, friend_id, status) VALUES (?, ?, ?)';
            db.run(insertSql, [senderId, recipientId, 'pending'], function(insertErr) {
              if (insertErr) {
                // Duplicate could happen if concurrent requests
                if (insertErr.message && insertErr.message.includes('UNIQUE constraint failed')) {
                  return reject(new Error('Friend request already sent'));
                }
                return reject(insertErr);
              }
              resolve({ friendshipId: this.lastID, message: 'Friend request sent' });
            });
          }
        });
      }
    );
  });
}

// Respond to a friend request: action is 'accept', 'reject', or 'block'
function respondToFriendRequest(recipientId, senderId, action) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    // Find a pending request where senderId -> recipientId
    const selectSql = `
      SELECT id, status FROM friendships
      WHERE user_id = ? AND friend_id = ? AND status = 'pending'
    `;
    db.get(selectSql, [senderId, recipientId], (err, row) => {
      if (err) return reject(err);
      if (!row) {
        return reject(new Error('Friend request not found'));
      }

      const friendshipId = row.id;
      let newStatus;
      if (action === 'accept') newStatus = 'accepted';
      else if (action === 'reject') newStatus = 'rejected';
      else if (action === 'block') newStatus = 'blocked';
      else return reject(new Error('Invalid action'));

      const updateSql = 'UPDATE friendships SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      db.run(updateSql, [newStatus, friendshipId], function(updateErr) {
        if (updateErr) return reject(updateErr);
        if (this.changes === 0) {
          return reject(new Error('Failed to update friend request'));
        }
        resolve({ friendshipId, status: newStatus, message: `Friend request ${action}ed` });
      });
    });
  });
}

// Remove a friend or cancel a pending request
function removeFriend(userId, friendId) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    // Delete any friendship involving both users, regardless of who initiated
    const deleteSql = `
      DELETE FROM friendships
      WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
    `;
    db.run(deleteSql, [userId, friendId, friendId, userId], function(err) {
      if (err) return reject(err);
      if (this.changes === 0) {
        return reject(new Error('Friendship not found'));
      }
      resolve({ message: 'Friend removed successfully' });
    });
  });
}

// Check if two users are friends (accepted)
function areFriends(userId, otherId) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
        AND ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
      LIMIT 1
    `;
    db.get(sql, [userId, otherId, otherId, userId], (err, row) => {
      if (err) return reject(err);
      resolve(!!row);
    });
  });
}

module.exports = {
  getFriends,
  getIncomingRequests,
  getOutgoingRequests,
  sendFriendRequest,
  respondToFriendRequest,
  removeFriend,
  areFriends
};
