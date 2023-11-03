const mongoose = require('mongoose');
const { reviewIntervalLengthEnum, cardLearningOrderEnum } = require('../util/enum');

const integerValidator = {
  validator: Number.isInteger,
  message: '{VALUE} is not an integer value',
};

const StudySessionSchema = new mongoose.Schema({
  startTime: { type: Date, default: Date.now() },
  endTime: { type: Date, required: true },
  newCards: { type: [mongoose.Types.ObjectId], ref: 'Flashcard' },
  reviewCards: { type: [mongoose.Types.ObjectId], ref: 'Flashcard' },
  repeatCards: { type: [mongoose.Types.ObjectId], ref: 'Flashcard' },
});

const StudyProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Types.ObjectId, ref: 'User' },
  flashcards: {
    new: { type: [mongoose.Types.ObjectId], ref: 'Flashcard' },
    perfected: { type: [mongoose.Types.ObjectId], ref: 'Flashcard' },
    toStudy: { type: [mongoose.Types.ObjectId], ref: 'Flashcard' },
    blacklist: { type: [mongoose.Types.ObjectId], ref: 'Flashcard' },
  },
  extractionDeck: { type: mongoose.Types.ObjectId, ref: 'Deck' },
  decks: { type: [mongoose.Types.ObjectId], ref: 'Deck' },
  studySession: { type: StudySessionSchema },
  freemiumLimit: {
    studyStart: { type: Date, default: Date.now() },
    studyEnd: { type: Date, default: Date.now() },
  },
  studyConfig: {
    newCardsPerSession: {
      type: Number, default: 10, min: 0, validate: integerValidator,
    },
    maxReviewCardsPerSession: {
      type: Number, default: 20, min: 0, validate: integerValidator,
    },
    reviewIntervalLength: { type: String, enum: [...reviewIntervalLengthEnum.keys()], default: 'STANDARD' },
    cardLearningOrder: {
      type: String,
      enum: Object.values(cardLearningOrderEnum),
      default: cardLearningOrderEnum.MOST_FREQUENT_WITHIN_DECK,
    },
    studySessionDuration: {
      type: Number, default: 3600, min: 30, validate: integerValidator,
    }, // seconds (default: 1h)
  },
  createdAt: { type: Date, default: Date.now() },
});

const StudyProfileModel = mongoose.model('StudyProfile', StudyProfileSchema);

module.exports = { StudyProfile: StudyProfileModel };
