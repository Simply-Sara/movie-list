const express = require('express');
const { checkPassword } = require('../../utils/password');
const { hashPassword, updateUserPassword } = require('../../utils/user');
const { requireAuth } = require('../../middleware/auth');
const router = express.Router();

router.post('/', requireAuth, async (req, res) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;
  const userId = req.user.userId;

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return res.status(400).json({ error: 'All fields are required', code: 'VALIDATION_ERROR' });
  }

  // Enhanced password validation
  if (newPassword.length < 9) {
    return res.status(400).json({ error: 'New password must be at least 9 characters', code: 'PASSWORD_TOO_WEAK' });
  }

  // Basic complexity check: at least one letter and one number
  if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return res.status(400).json({ error: 'New password must contain at least one letter and one number', code: 'PASSWORD_TOO_WEAK' });
  }

  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({ error: 'New passwords do not match', code: 'PASSWORD_MISMATCH' });
  }

  try {
    const passwordHash = await checkPassword(userId, currentPassword);
    // Generic error message to prevent user enumeration
    if (!passwordHash) {
      return res.status(401).json({ error: 'Authentication failed', code: 'AUTHENTICATION_FAILED' });
    }

    const hashedNewPassword = await hashPassword(newPassword);
    // Extract salt from the hash to store in separate column (for legacy compatibility)
    const hashPart = hashedNewPassword.split('$2a$12$')[1] || '';
    const salt = hashPart.substring(0, 22);
    await updateUserPassword(userId, hashedNewPassword, salt);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to update password', code: 'CHANGE_PASSWORD_FAILED' });
  }
});

module.exports = router;
