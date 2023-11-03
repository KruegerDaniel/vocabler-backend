const express = require('express');
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/authentication');

const paymentRoutes = express.Router();

paymentRoutes.get('/customer-info', authenticateToken, paymentController.getCustomerInfo);
paymentRoutes.post('/cancel-subscription', authenticateToken, paymentController.cancelSubscription);

module.exports = paymentRoutes;
