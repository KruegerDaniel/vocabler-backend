const logger = require('./logger');

require('dotenv').config();

// Database connection
const DB_ADDRESS = process.env.DB_ADDRESS || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'vocablerDB';
const MONGO_URI = `${DB_ADDRESS}/${DB_NAME}` || '';

// Server settings
const PROCESS_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 8081;

// JWT
const { JWT_SECRET } = process.env;
const JWT_EXPIRATION_TIME = Number.parseInt(process.env.JWT_EXPIRATION_TIME, 10) || 86400; // 1 day

// Bcrypt
const SALT_ROUNDS = Number.parseInt(process.env.SALT_ROUNDS, 10) || 10;

// Stripe
const { STRIPE_SECRET_KEY } = process.env;
const { STRIPE_PUBLISHABLE_KEY } = process.env;

// Server Study Settings
const COVERAGE_MIN_STUDY_LEVEL = 0;
const TRIAL_LENGTH_DAYS = 30;

// multer settings
const MAX_FILE_SIZE = 1_000_000; // 3MB
const IMAGE_DESTINATION = './public/images/profile';

let errorMessage;
if (!JWT_SECRET) {
  errorMessage = 'No JWT Secret provided in env. Exiting...';
  logger.error(errorMessage);
  throw Error(errorMessage);
} else if (!STRIPE_SECRET_KEY || !STRIPE_PUBLISHABLE_KEY) {
  errorMessage = 'No Stripe Secret Key or Publishable Key provided in env. Exiting...';
  logger.error(errorMessage);
  throw Error(errorMessage);
}

module.exports = {
  MONGO_URI,
  PORT,
  SALT_ROUNDS,
  JWT_SECRET,
  COVERAGE_MIN_STUDY_LEVEL,
  JWT_EXPIRATION_TIME,
  STRIPE_PUBLISHABLE_KEY,
  STRIPE_SECRET_KEY,
  TRIAL_LENGTH_DAYS,
  PROCESS_ENV,
  MAX_FILE_SIZE,
  IMAGE_DESTINATION,
};
