const jwt = require('jsonwebtoken');
const logger = require('../logger');
const { JWT_SECRET } = require('../config');
const { User } = require('../models/user');

async function authenticateToken(req, res, next) {
  try {
    const token = req.cookies.jwt;
    if (token) {
      const verifiedToken = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(verifiedToken.userId).select('-password');
      if (!user) {
        return res.status(404).json({ error: 'NOT FOUND', message: 'User does not exist' });
      }
      req.user = user;
      next();
    } else {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'No token provided in the request' });
    }
  } catch (error) {
    logger.error(error);
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication failed' });
  }
  return null;
}

async function optionalSession(req, res, next) {
  try {
    const token = req.cookies.jwt;
    if (token) {
      const verifiedToken = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(verifiedToken.userId).select('-password');
      if (user) {
        logger.info('JWT token found. Session info added.');
        req.user = user;
      }
    }
  } catch (error) {
    logger.info('JWT token not found. Proceeding without session.');
  }
  next();
}

module.exports = { authenticateToken, optionalSession };
