const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

// Register a new organizer
router.post('/register', register);

// Login an organizer and return JWT
router.post('/login', login);

module.exports = router;