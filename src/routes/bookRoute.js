const express = require('express');
const bookController = require('../controllers/booksController');
const { optionalSession, authenticateToken } = require('../middleware/authentication');

const bookRoutes = express.Router();

bookRoutes.get('/', bookController.getAllBooks);
bookRoutes.get('/genres', bookController.getBookByGenre);
bookRoutes.get('/search', bookController.getBooksByTitleOrAuthor);
bookRoutes.get('/:book_id', optionalSession, bookController.getBookByID);
bookRoutes.get('/:book_id/progress', authenticateToken, bookController.getBookLearningProgress);

module.exports = bookRoutes;
