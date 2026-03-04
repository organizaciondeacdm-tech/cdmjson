const express = require('express');
const router = express.Router();
const { 
  login, 
  refreshToken, 
  logout, 
  changePassword,
  getProfile 
} = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const { validateUser } = require('../middleware/validation');

router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/logout', authMiddleware, logout);
router.post('/change-password', authMiddleware, changePassword);
router.get('/profile', authMiddleware, getProfile);

module.exports = router;