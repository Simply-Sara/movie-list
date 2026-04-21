const express = require('express');
const { createUser, findUserByUsername } = require('../../utils/user');
const { generateToken } = require('../../utils/auth');
const router = express.Router();

router.post('/', async (req, res) => {
  const { username, password, confirmPassword } = req.body;

  if (!username || !password || !confirmPassword) {
    return res.status(400).json({ error: 'Username, password, and confirm password are required', code: 'VALIDATION_ERROR' });
  }

  // Trim and validate username
  const trimmedUsername = username.trim();
  if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
    return res.status(400).json({ error: 'Username must be 3-30 characters', code: 'INVALID_USERNAME' });
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
    return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores', code: 'INVALID_USERNAME' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match', code: 'PASSWORD_MISMATCH' });
  }

  // Enhanced password validation: minimum 9 characters with letter+number
  if (password.length < 9) {
    return res.status(400).json({ error: 'Password must be at least 9 characters', code: 'PASSWORD_TOO_WEAK' });
  }

  // Basic complexity check: at least one letter and one number
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return res.status(400).json({ error: 'Password must contain at least one letter and one number', code: 'PASSWORD_TOO_WEAK' });
  }

  try {
    const existingUser = await findUserByUsername(trimmedUsername);
    // Generic error message to prevent user enumeration
    if (existingUser) {
      return res.status(400).json({ error: 'Registration failed', code: 'REGISTRATION_FAILED' });
    }

    const user = await createUser(trimmedUsername, password);

    res.json({
      id: user.id,
      username: user.username,
      message: 'User created successfully. Please login.'
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed', code: 'REGISTRATION_FAILED' });
  }
});

module.exports = router;
