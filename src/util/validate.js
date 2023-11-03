const { Book } = require('../models/book');
const { Deck } = require('../models/deck');
const { Flashcard } = require('../models/flashcard');
const { StudyProfile } = require('../models/studyProfile');
const { deckTypeEnum } = require('./enum');
const logger = require('../logger');
const { Review } = require('../models/review');

class Validator {
  static async getValidatedDeck(deckId) {
    const deck = await Deck.findById(deckId);
    if (!deck) {
      const error = new Error(`Deck with deckId ${deckId} does not exist`);
      error.status = 404;
      throw error;
    }
    return deck;
  }

  static async getValidatedBook(bookId) {
    const book = await Book.findById(bookId);
    if (!book) {
      const error = new Error(`Book with bookId ${bookId} does not exist`);
      error.status = 404;
      throw error;
    }
    return book;
  }

  static async getValidatedFlashcard(flashcardId) {
    const flashcard = await Flashcard.findById(flashcardId);
    if (!flashcard) {
      const error = new Error(`Flashcard with id ${flashcardId} does not exist`);
      error.status = 404;
      throw error;
    }
    return flashcard;
  }

  static async getValidatedReview(reviewId) {
    const review = await Review.findById(reviewId);
    if (!review) {
      const error = new Error(`Review with id ${reviewId} does not exist`);
      error.status = 404;
      throw error;
    }
    return review;
  }

  static async getValidatedStudyProfileByUserId(userId) {
    const studyProfile = await StudyProfile.findOne({ user: userId });
    if (!studyProfile) {
      const error = new Error(`StudyProfile with userId ${userId} does not exist`);
      error.status = 404;
      throw error;
    }
    return studyProfile;
  }

  static validateDeckType(deckType) {
    if (!Object.values(deckTypeEnum).includes(deckType)) {
      logger.error(`DeckType ${deckType} does not match enum`);
      throw new Error(`DeckType ${deckType} is not a valid deck type`);
    }
  }
}

module.exports = Validator;
