const express = require('express');
const reviewController = require('../controllers/reviewController');
const { authenticateToken } = require('../middleware/authentication');

const reviewRoutes = express.Router();

reviewRoutes.get('/', reviewController.getAllReviews);
reviewRoutes.get('/:id', reviewController.getReviewById);
reviewRoutes.get('/user/:userId', reviewController.getReviewsByUserId);

reviewRoutes.post('/', authenticateToken, reviewController.createReview);

reviewRoutes.put('/:id', authenticateToken, reviewController.updateReview);

reviewRoutes.patch('/:id/like', authenticateToken, reviewController.likeReview);
reviewRoutes.patch('/:id/dislike', authenticateToken, reviewController.dislikeReview);
reviewRoutes.patch('/:id/like/undo', authenticateToken, reviewController.removeLikedReview);
reviewRoutes.patch('/:id/dislike/undo', authenticateToken, reviewController.removeDislikedReview);

reviewRoutes.delete('/:id', authenticateToken, reviewController.deleteReview);

module.exports = reviewRoutes;
