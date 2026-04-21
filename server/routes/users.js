const express = require('express');
const { getUserById, updateUsername, findUserByUsername, getAllUsers } = require('../utils/user');
const { requireAuth } = require('../middleware/auth');
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

// GET /api/users/profile - Get current user's profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }
    
    res.json({ 
      id: user.id, 
      username: user.username 
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to get profile', code: 'GET_PROFILE_FAILED' });
  }
});

// PUT /api/users/profile - Update user profile
router.put('/profile', requireAuth, async (req, res) => {
  const { username } = req.body;
  
  if (!username || username.trim() === '') {
    return res.status(400).json({ error: 'Username is required', code: 'VALIDATION_ERROR' });
  }
  
  const trimmedUsername = username.trim();
  
  // Basic username validation
  if (trimmedUsername.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters', code: 'USERNAME_TOO_SHORT' });
  }
  
  if (trimmedUsername.length > 30) {
    return res.status(400).json({ error: 'Username must be at most 30 characters', code: 'USERNAME_TOO_LONG' });
  }
  
  // Alphanumeric and underscore only
  if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
    return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores', code: 'INVALID_USERNAME' });
  }
  
  try {
    const userId = req.user.userId;
    
    // Check if username already exists (excluding current user)
    const existingUser = await findUserByUsername(trimmedUsername);
    if (existingUser && existingUser.id !== userId) {
      // Generic error to prevent user enumeration
      return res.status(400).json({ error: 'Update failed', code: 'UPDATE_FAILED' });
    }
    
    const result = await updateUsername(userId, trimmedUsername);
    
    if (result.changes === 0) {
      return res.status(400).json({ error: 'Update failed', code: 'UPDATE_FAILED' });
    }
    
    res.json({ 
      id: userId, 
      username: trimmedUsername,
      message: 'Profile updated successfully' 
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile', code: 'UPDATE_PROFILE_FAILED' });
  }
});

module.exports = router;