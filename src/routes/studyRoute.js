const express = require('express');
const studyController = require('../controllers/studyController');
const { authenticateToken } = require('../middleware/authentication');
const { authorizeStudySession, authorizeStudyConfig, concludeStudySession } = require('../middleware/authorization');

const studyRoutes = express.Router();

studyRoutes.post('/deck', authenticateToken, studyController.addDeck);

studyRoutes.put('/deck/:deckId', authenticateToken, studyController.reassignDeck);
studyRoutes.put('/deck/:deckId/extraction', authenticateToken, studyController.setExtractionDeck);
studyRoutes.put('/session/flashcard/:flashcardId', authenticateToken, studyController.rateFlashcard);
studyRoutes.put('/session/config', authenticateToken, authorizeStudyConfig, studyController.setStudyConfig);

studyRoutes.patch('/deck/:deckId/progress', authenticateToken, studyController.updateBookProgress);

studyRoutes.get('/deck', authenticateToken, studyController.getDecksByUser);
studyRoutes.get('/session/flashcard', authenticateToken, authorizeStudySession, studyController.getStudyFlashcard, concludeStudySession);
studyRoutes.get('/session/config', authenticateToken, studyController.getStudyConfig);
studyRoutes.get('/stats', authenticateToken, studyController.getHomeStats);

studyRoutes.delete('/deck/:deckId', authenticateToken, studyController.deleteDeck);

module.exports = studyRoutes;
