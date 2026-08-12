const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Re-check the user still exists (handles deleted/deactivated accounts
    // whose old token is still technically valid).
    const user = await User.findById(payload.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    req.user = user; // available to every downstream handler
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = requireAuth;
