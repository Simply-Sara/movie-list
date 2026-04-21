const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SALT_ROUNDS = 12;

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return await bcrypt.hash(password, salt);
}

async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

function generateToken(userId, username) {
  return jwt.sign(
    { userId, username },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  SALT_ROUNDS
};
