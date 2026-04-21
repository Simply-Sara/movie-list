const express = require('express');
const { findUserByUsername } = require('../../utils/user');
const { checkPassword } = require('../../utils/password');
const { generateToken } = require('../../utils/auth');
const { requireAuth } = require('../../middleware/auth');
const router = express.Router();

router.post('/', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required', code: 'VALIDATION_ERROR' });
  }

  try {
    const user = await findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'AUTH_FAILED' });
    }

    const passwordHash = await checkPassword(user.id, password);
    if (!passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'AUTH_FAILED' });
    }

    // If user has no password hash (existing user), they need to set one
    if (!user.password_hash) {
      return res.status(401).json({ 
        error: 'Password not set', 
        code: 'PASSWORD_NOT_SET',
        requiresPasswordSetup: true 
      });
    }

    const token = generateToken(user.id, user.username);
    
    res.json({ 
      token,
      user: { id: user.id, username: user.username }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed', code: 'LOGIN_FAILED' });
  }
});

module.exports = router;
