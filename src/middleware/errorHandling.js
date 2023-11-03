/* eslint-disable no-unused-vars */
const logger = require('../logger');

const errorHandler = (err, req, res, next) => {
  logger.error(`Error occured in ${req.method} ${req.url}`);
  logger.error(err);

  const status = err.status || 500;

  if (process.env.NODE_ENV === 'production' && status >= 500) {
    res.status(status).json({
      status,
      message: 'Something went wrong',
    });
  } else {
    res.status(status).json({
      status,
      message: err.message,
    });
  }
};

module.exports = errorHandler;
