const express = require('express');
const router = express.Router();

const registerRouter = require('./register');
const loginRouter = require('./login');
const logoutRouter = require('./logout');
const changePasswordRouter = require('./change-password');

router.use('/register', registerRouter);
router.use('/login', loginRouter);
router.use('/logout', logoutRouter);
router.use('/change-password', changePasswordRouter);

module.exports = router;