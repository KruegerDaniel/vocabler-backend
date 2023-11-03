/* eslint-disable implicit-arrow-linebreak */
const { Book } = require('../models/book');
const { Deck } = require('../models/deck');
const { StudyProfile } = require('../models/studyProfile');
const logger = require('../logger');
const { Flashcard } = require('../models/flashcard');
const { reassignIdInObject, removeIdFromObject } = require('../util/utilMethods');
const Validator = require('../util/validate');
const { User } = require('../models/user');
const { deckTypeEnum } = require('../util/enum');
const { COVERAGE_MIN_STUDY_LEVEL } = require('../config');

/**
 * Returns vocabLearned and coverage for given book.
 * @param {[VocabSchema]} bookVocabList
 * @param {[ObjectId]} learnedFlashcards
 * @param {Number} bookTotalWords
 * @returns
 */
async function getBookCoverage(bookVocabList, flashcards) {
  const flashcardIds = [...flashcards.new, ...flashcards.blacklist, ...flashcards.perfected, ...flashcards.toStudy];

  const learnedFlashcards = await Flashcard.find({
    _id: { $in: flashcardIds },
  });

  const overlapList = bookVocabList.filter(
    (vocab) =>
      learnedFlashcards.some(
        (flashcard) =>
          flashcard.lexicalEntryId.equals(vocab.lexicalEntryId) &&
          flashcard.pos === vocab.pos &&
          flashcard.studyLevel >= COVERAGE_MIN_STUDY_LEVEL
      )
    // eslint-disable-next-line function-paren-newline
  );

  const vocabLearned = overlapList.length;
  const coverage = overlapList.reduce((acc, curr) => acc + curr.freq, 0);
  return { vocabLearned, coverage };
}

const getBookLearningProgress = async (bookId, userId) => {
  const studyProfile = await Validator.getValidatedStudyProfileByUserId(userId);
  const book = await Validator.getValidatedBook(bookId);
  const deck = await Deck.findOne({ studyProfile: studyProfile._id, book: bookId });

  if (!deck) {
    logger.info('No user deck found for book, calculating coverage');
    return getBookCoverage(book.vocabList, studyProfile.flashcards);
  }

  return { vocabLearned: deck.vocabLearned, coverage: deck.coverage };
};

const getBookByID = async (bookId, userId = null) => {
  const book = (await Book.findById(bookId).populate('reviews')).toObject();
  book.reviews = book.reviews.sort((a, b) => b.date - a.date);

  if (!book) {
    logger.error(`Book with id: ${bookId} does not exist`);

    const error = new Error(`Book with id: ${bookId} does not exist`);
    error.status = 404;
    throw error;
  }

  if (userId) {
    // add extra user-specific information
    const studyProfile = await StudyProfile.findOne({ user: userId });
    const deck = await Deck.findOne({ studyProfile: studyProfile._id, book: bookId });

    book.deckExists = !!deck;
    if (book.deckExists) {
      book.stats = { vocabLearned: deck.vocabLearned, coverage: deck.coverage };
      book.deckId = deck._id;
    }
  }

  delete book.vocabList;
  return book;
};

const updateBookReaders = async (bookId, user, targetDeckType) => {
  const book = await Validator.getValidatedBook(bookId);
  // identify target field using deckType
  let targetField = '';
  switch (targetDeckType) {
    case deckTypeEnum.STUDYING:
      targetField = 'reading';
      break;
    case deckTypeEnum.FINISHED:
      targetField = 'finished';
      break;
    case deckTypeEnum.WISHLIST:
      targetField = 'wantToRead';
      break;
    default:
      logger.error(`User bookList can not handle deckType ${targetDeckType}`);
      throw new Error(`User bookList can not handle deckType ${targetDeckType}`);
  }

  // reassign changes in book and user and update
  reassignIdInObject(user.bookList, bookId, targetField);
  reassignIdInObject(book.users, user._id, targetField);
  await User.updateOne({ _id: user._id }, { bookList: user.bookList });
  await Book.updateOne({ _id: bookId }, { users: book.users });
};

const removeBookReader = async (bookId, user) => {
  const book = await Validator.getValidatedBook(bookId);

  // remove ids from book and user
  removeIdFromObject(user.bookList, bookId);
  removeIdFromObject(book.users, user._id);
  await User.updateOne({ _id: user._id }, { bookList: user.bookList });
  await Book.updateOne({ _id: bookId }, { users: book.users });
};

module.exports = {
  getBookByID,
  getBookCoverage,
  removeBookReader,
  updateBookReaders,
  getBookLearningProgress,
};
