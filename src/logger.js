const { createLogger, format, transports } = require('winston');

const {
  combine, colorize, errors, timestamp, label, printf,
} = format;

const logFormat = printf(({ level, message, timestamp }) => `${timestamp} [${level}]: ${message}`);

const fullErrorLogFormat = format.printf(({
  level, message, timestamp, stack,
}) => `${timestamp} [${level}] ${message} ${stack || ''}`);

// Transports are defined differently since colorize is escaped incorrectly in log file
const logger = createLogger({
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }), // Include error stack trace
    fullErrorLogFormat,
  ),
  transports: [
    new transports.Console({
      format: combine(colorize(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
    }),
    new transports.File({
      filename: 'vocabler.log',
    }),
  ],
});

module.exports = logger;
