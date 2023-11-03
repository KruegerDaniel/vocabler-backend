require('dotenv').config();

// Import external libraries
const cors = require('cors');
const express = require('express');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');

// Import internal modules
const cookieParser = require('cookie-parser');
const { logRequest } = require('./middleware/logging');
const errorHandler = require('./middleware/errorHandling');
const logger = require('./logger');
const { webhook } = require('./controllers/paymentController');
const config = require('./config');

// Import routes
const bookRoutes = require('./routes/bookRoute');
const paymentRoutes = require('./routes/paymentRoute');
const reviewRoutes = require('./routes/reviewRoute');
const studyRoutes = require('./routes/studyRoute');
const userRoutes = require('./routes/userRoute');

// Import other
const swaggerDocument = require('./swagger.json');

const app = express();

// database connection
mongoose.connect(config.MONGO_URI).then(() => {
  logger.info(`Successfully connected to database at ${config.MONGO_URI}}`);
});

// middleware
app.use(express.json());
app.use(cookieParser());
app.use(logRequest);
app.use(cors({ credentials: true, origin: 'http://localhost:3000' }));

// static public files
app.use(express.static('public'));

// cors
app.get('/cors', (req, res) => {
  res.send({ msg: 'This has CORS enabled' });
});

// swagger api
if (config.PROCESS_ENV === 'development') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

// webhook for stripe events
app.post('/webhook', webhook);

// routes
app.use('/users', userRoutes);
app.use('/reviews', reviewRoutes);
app.use('/books', bookRoutes);
app.use('/study', studyRoutes);
app.use('/payment', paymentRoutes);

// error handling
app.use(errorHandler);

// start server
app.listen(config.PORT, () => {
  logger.info(`Server running in ${config.PROCESS_ENV} mode. Listening on port ${config.PORT}`);
});
