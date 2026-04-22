const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  getFriends,
  getIncomingRequests,
  getOutgoingRequests,
  sendFriendRequest,
  respondToFriendRequest,
  removeFriend
} = require('../utils/friends');
const dbModule = require('../database');

const router = express.Router();

// GET /api/friends - Get current user's friends list
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const friends = await getFriends(userId);
    res.json(friends);
  } catch (err) {
    console.error('Get friends error:', err);
    res.status(500).json({ error: 'Failed to get friends list', code: 'GET_FRIENDS_FAILED' });
  }
});

// GET /api/friends/requests/incoming - Get pending requests sent to current user
router.get('/requests/incoming', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const requests = await getIncomingRequests(userId);
    res.json(requests);
  } catch (err) {
    console.error('Get incoming requests error:', err);
    res.status(500).json({ error: 'Failed to get incoming requests', code: 'GET_INCOMING_REQUESTS_FAILED' });
  }
});

// GET /api/friends/requests/outgoing - Get pending requests sent by current user
router.get('/requests/outgoing', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const requests = await getOutgoingRequests(userId);
    res.json(requests);
  } catch (err) {
    console.error('Get outgoing requests error:', err);
    res.status(500).json({ error: 'Failed to get outgoing requests', code: 'GET_OUTGOING_REQUESTS_FAILED' });
  }
});

// POST /api/friends/:username - Send a friend request to user with given username
router.post('/:username', requireAuth, async (req, res) => {
  const { username } = req.params;
  const senderId = req.user.userId;

  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Username is required', code: 'USERNAME_REQUIRED' });
  }

  try {
    const result = await sendFriendRequest(senderId, username.trim());
    res.json(result);
  } catch (err) {
    console.error('Send friend request error:', err);
    let status = 500;
    let code = 'SEND_REQUEST_FAILED';
    if (err.message === 'User not found') {
      status = 404;
      code = 'USER_NOT_FOUND';
    } else if (err.message.includes('Cannot send friend request to yourself') || err.message === 'Already friends' || err.message.includes('already sent')) {
      status = 400;
      code = 'INVALID_REQUEST';
    }
    res.status(status).json({ error: err.message, code });
  }
});

// POST /api/friends/:friendId/accept - Accept an incoming friend request from friendId
router.post('/:friendId/accept', requireAuth, async (req, res) => {
  const { friendId } = req.params;
  const recipientId = req.user.userId;
  const senderId = parseInt(friendId, 10);

  if (isNaN(senderId)) {
    return res.status(400).json({ error: 'Invalid friend ID', code: 'INVALID_ID' });
  }

  try {
    const result = await respondToFriendRequest(recipientId, senderId, 'accept');
    res.json(result);
  } catch (err) {
    console.error('Accept friend request error:', err);
    let status = 500;
    if (err.message === 'Friend request not found') {
      status = 404;
    } else if (err.message.includes('Invalid action')) {
      status = 400;
    }
    res.status(status).json({ error: err.message, code: 'ACCEPT_REQUEST_FAILED' });
  }
});

// POST /api/friends/:friendId/reject - Reject an incoming friend request from friendId
router.post('/:friendId/reject', requireAuth, async (req, res) => {
  const { friendId } = req.params;
  const recipientId = req.user.userId;
  const senderId = parseInt(friendId, 10);

  if (isNaN(senderId)) {
    return res.status(400).json({ error: 'Invalid friend ID', code: 'INVALID_ID' });
  }

  try {
    const result = await respondToFriendRequest(recipientId, senderId, 'reject');
    res.json(result);
  } catch (err) {
    console.error('Reject friend request error:', err);
    let status = 500;
    if (err.message === 'Friend request not found') {
      status = 404;
    } else if (err.message.includes('Invalid action')) {
      status = 400;
    }
    res.status(status).json({ error: err.message, code: 'REJECT_REQUEST_FAILED' });
  }
});

// POST /api/friends/:friendId/block - Block a user
router.post('/:friendId/block', requireAuth, async (req, res) => {
  const { friendId } = req.params;
  const blockerId = req.user.userId;
  const blockeeId = parseInt(friendId, 10);

  if (isNaN(blockeeId)) {
    return res.status(400).json({ error: 'Invalid friend ID', code: 'INVALID_ID' });
  }

  try {
    const result = await respondToFriendRequest(blockerId, blockeeId, 'block');
    res.json(result);
  } catch (err) {
    console.error('Block user error:', err);
    let status = 500;
    if (err.message === 'Friend request not found') {
      status = 404;
    } else if (err.message.includes('Invalid action')) {
      status = 400;
    }
    res.status(status).json({ error: err.message, code: 'BLOCK_USER_FAILED' });
  }
});

// DELETE /api/friends/:friendId - Remove a friend or cancel a pending request
router.delete('/:friendId', requireAuth, async (req, res) => {
  const { friendId } = req.params;
  const userId = req.user.userId;
  const targetId = parseInt(friendId, 10);

  if (isNaN(targetId)) {
    return res.status(400).json({ error: 'Invalid friend ID', code: 'INVALID_ID' });
  }

  if (userId === targetId) {
    return res.status(400).json({ error: 'Cannot remove yourself', code: 'INVALID_REQUEST' });
  }

  try {
    const result = await removeFriend(userId, targetId);
    res.json(result);
  } catch (err) {
    console.error('Remove friend error:', err);
    let status = 500;
    if (err.message === 'Friendship not found') {
      status = 404;
    }
    res.status(status).json({ error: err.message, code: 'REMOVE_FRIEND_FAILED' });
  }
});

module.exports = router;
