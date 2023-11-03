const studyService = require('../services/studyService');
const deckService = require('../services/deckService');
const bookService = require('../services/bookService');

const { StudyProfile } = require('../models/studyProfile');
const { answerEnum } = require('../util/enum');
const { Deck } = require('../models/deck');

const addDeck = async (req, res, next) => {
  try {
    const { bookId } = req.body;
    const { user } = req;
    const deckType = req.query.type;

    const deck = await deckService.createBookDeck(user._id, bookId, deckType);
    await bookService.updateBookReaders(bookId, user, deckType);

    res.status(200).json(deck);
  } catch (error) {
    next(error);
  }
};

const getStudyFlashcard = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const newFlashcard = await studyService.getStudySessionFlashcard(userId);

    res.status(200).json(newFlashcard);
    next();
  } catch (error) {
    next(error);
  }
};

const getDecksByUser = async (req, res, next) => {
  try {
    const { user } = req;
    const decks = await Deck.find({ studyProfile: user.studyProfile });

    res.status(200).json(decks);
  } catch (error) {
    next(error);
  }
};

const setStudyConfig = async (req, res, next) => {
  try {
    const { studyConfig } = req.body;
    const { user } = req;

    await StudyProfile.findOneAndUpdate({ user: user._id }, { studyConfig }, { runValidators: true });

    res.status(200).send('StudyConfig successfully set');
  } catch (error) {
    next(error);
  }
};

const getStudyConfig = async (req, res, next) => {
  try {
    const { user } = req;
    const { studyConfig } = await StudyProfile.findOne({ user: user._id });

    res.status(200).json(studyConfig);
  } catch (error) {
    next(error);
  }
};

const rateFlashcard = async (req, res, next) => {
  try {
    const { flashcardId } = req.params;
    const { answer } = req.body;
    const userId = req.user._id;

    if (!(typeof answer === 'string' && Object.values(answerEnum).includes(answer))) {
      const error = new Error('Answer is not a string/valid answer');
      error.status = 400;
      throw error;
    }

    await studyService.updateSessionFlashcard(userId, flashcardId, answer);
    res.status(200).json({ message: `Successfully updated flashcard ${flashcardId}` });
  } catch (error) {
    next(error);
  }
};

const reassignDeck = async (req, res, next) => {
  try {
    const { deckId } = req.params;
    const { user } = req;
    const deckType = req.query.type;

    const deck = await deckService.reassignDeck(user._id, deckId, deckType);
    const bookId = deck.book._id;
    await bookService.updateBookReaders(bookId, user, deckType);

    res.status(200).send(`Successfully reassigned deckType of ${deckId} to ${deckType}`);
  } catch (error) {
    next(error);
  }
};

const setExtractionDeck = async (req, res, next) => {
  try {
    const { deckId } = req.params;
    const userId = req.user._id;
    await deckService.setExtractionDeck(userId, deckId);

    res.status(200).send(`Successfully set ${deckId} as extractionDeck`);
  } catch (error) {
    next(error);
  }
};

const deleteDeck = async (req, res, next) => {
  try {
    const { deckId } = req.params;
    const { user } = req;
    const removedDeck = await deckService.deleteDeck(user._id, deckId);
    const bookId = removedDeck.book;
    await bookService.removeBookReader(bookId, user);

    res.status(200).send(`Successfully deleted ${deckId}`);
  } catch (error) {
    next(error);
  }
};

const getHomeStats = async (req, res, next) => {
  try {
    const { user } = req;
    const homeStats = await studyService.getStudyStats(user._id);

    res.status(200).json(homeStats);
  } catch (error) {
    next(error);
  }
};

const updateBookProgress = async (req, res, next) => {
  try {
    const { user } = req;
    const { deckId } = req.params;
    const { progress } = req.body;

    if (typeof progress !== 'number') {
      const error = new Error('Progress is not a number');
      error.status = 400;
      throw error;
    }

    await deckService.updateBookProgress(user._id, deckId, progress);
    res.status(200).send(`Successfully updated book progress in deck: ${deckId}`);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addDeck,
  getDecksByUser,
  getStudyFlashcard,
  getStudyConfig,
  rateFlashcard,
  setStudyConfig,
  reassignDeck,
  deleteDeck,
  setExtractionDeck,
  getHomeStats,
  updateBookProgress,
};
