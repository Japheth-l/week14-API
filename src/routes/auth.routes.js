const express = require('express');
const router = express.Router();

const { validateSignup, validateLogin } = require('../validators/authValidator');
const { signup, login } = require('../controllers/auth.controller');

router.post('/signup', validateSignup, signup);
router.post('/login', validateLogin, login);

module.exports = router;
