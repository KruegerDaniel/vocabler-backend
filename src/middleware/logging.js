const logger = require('../logger');

function logRequest(req, res, next) {
  logger.info(`${req.method} request hit at ${req.originalUrl} by address ${req.ip}`);
  next();
}

module.exports = { logRequest };
