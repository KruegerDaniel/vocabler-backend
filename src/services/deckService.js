const { Deck } = require('../models/deck');
const { Flashcard } = require('../models/flashcard');
const { StudyProfile } = require('../models/studyProfile');
const { deckTypeEnum } = require('../util/enum');
const bookService = require('./bookService');
const studyUtil = require('../util/studyUtil');
const Validator = require('../util/validate');

/**
 * Add the deckId to all flashcards in the corresponding book
 * Matches all existing flashcards to the vocab in the new book.
 * It updates each flashcard by adding deckId and frequencies.
 * @param {[VocabSchema]} bookVocabList
 * @param {[Flashcard]} existingFlashcards
 * @param deck: deck to be added
 * @returns all learned flashcards within the book
 */
async function updateFlashcardDecks(bookVocabList, existingFlashcards, deck) {
  // find all matching flashcards and get id and freq
  let filteredFlashcardInfo = existingFlashcards.filter((flashcard) => {
    const matchingVocab = bookVocabList.find(
      (vocab) => flashcard.lexicalEntryId.equals(vocab.lexicalEntryId) && flashcard.pos === vocab.pos,
    );
    if (matchingVocab) {
      // eslint-disable-next-line no-param-reassign
      flashcard.freq = matchingVocab.freq;
      return true;
    }
    return false;
  }); // pass on matching vocab.freq
  filteredFlashcardInfo = filteredFlashcardInfo.map((flashcard) => ({
    _id: flashcard._id,
    freq: flashcard.freq,
  }));

  // asynchronously update the flashcards
  await Promise.all(
    filteredFlashcardInfo.map(async (flashcard) => {
      const newDeckInfo = { deckId: deck._id, deckTitle: deck.title, freq: flashcard.freq };
      await Flashcard.findOneAndUpdate({ _id: flashcard._id }, { $push: { decks: newDeckInfo } });
    }),
  );
}

const createBookDeck = async (userId, bookId, deckType) => {
  // validate
  Validator.validateDeckType(deckType);
  const studyProfile = await Validator.getValidatedStudyProfileByUserId(userId);
  const book = await Validator.getValidatedBook(bookId);

  const existingDeck = await Deck.findOne({ book: book._id, studyProfile: studyProfile._id });
  if (existingDeck) {
    const error = new Error(`Deck already exists ${existingDeck._id}`);
    error.status = 409;
    throw error;
  }

  // create new deck
  const deck = new Deck({
    book: book._id,
    title: book.title,
    coverImage: book.coverImage,
    studyProfile: studyProfile._id,
    uniqueWords: book.uniqueWords,
    totalWords: book.totalWords,
    deckType,
  });

  const update = { $push: { decks: deck._id } };

  const { flashcards } = studyProfile;
  const allExistingFlashcardIds = [
    ...flashcards.new,
    ...flashcards.perfected,
    ...flashcards.toStudy,
    ...flashcards.blacklist,
  ];
  const allExistingFlashcards = await Flashcard.find({
    _id: { $in: allExistingFlashcardIds },
  });

  if (deckType === deckTypeEnum.STUDYING) {
    // create flashcards for non-existing
    const newFlashcardsIds = await studyUtil.createNewFlashcards(book, deck, allExistingFlashcards);
    if (newFlashcardsIds.length > 0) {
      update.$push['flashcards.new'] = newFlashcardsIds;
    }
    update.extractionDeck = deck._id;
  }

  // Assign all matching existing cards with deckId
  await updateFlashcardDecks(book.vocabList, allExistingFlashcards, deck);

  // set coverage and vocabLearned
  const { coverage, vocabLearned } = await bookService.getBookCoverage(book.vocabList, studyProfile.flashcards);
  deck.coverage = coverage;
  deck.vocabLearned = vocabLearned;
  await Deck.create(deck);

  await StudyProfile.findOneAndUpdate(
    {
      _id: studyProfile._id,
    },
    update,
  );

  return deck;
};

const reassignDeck = async (userId, deckId, deckType) => {
  Validator.validateDeckType(deckType);
  const deck = await Validator.getValidatedDeck(deckId);
  const studyProfile = await Validator.getValidatedStudyProfileByUserId(userId);
  await deck.populate('book');

  // update unnecessary
  if (deck.deckType === deckType) {
    return deck;
  }

  if (deckType === deckTypeEnum.STUDYING) {
    // create new flashcards
    const newFlashcardsIds = await studyUtil.createNewFlashcardsStudyProfile(deck.book, deck, studyProfile);
    if (newFlashcardsIds.length > 0) {
      await StudyProfile.findByIdAndUpdate(studyProfile._id, { $push: { 'flashcards.new': newFlashcardsIds } });
    }
  }
  if (deck._id.equals(studyProfile.extractionDeck)) {
    await StudyProfile.findByIdAndUpdate(studyProfile._id, { extractionDeck: null });
  }

  return Deck.findByIdAndUpdate(deckId, { $set: { deckType } });
};

const setExtractionDeck = async (userId, deckId) => {
  const deck = await Validator.getValidatedDeck(deckId);
  const studyProfile = await Validator.getValidatedStudyProfileByUserId(userId);

  if (deck._id.equals(studyProfile.extractionDeck)) {
    return;
  }
  if (deck.deckType === deckTypeEnum.STUDYING) {
    await StudyProfile.findByIdAndUpdate(studyProfile._id, { extractionDeck: deck._id });
    return;
  }

  const error = new Error('Unable to set non-studying decks as extraction deck');
  error.status = 400;
  throw error;
};

const deleteDeck = async (userId, deckId) => {
  const deck = await Validator.getValidatedDeck(deckId);
  const studyProfile = await Validator.getValidatedStudyProfileByUserId(userId);

  // get list of flashcards containing only deck._id in decks
  const listOfUniqueFlashcards = (await Flashcard.find({ 'decks.deckId': deck._id })).filter(
    (flashcard) => flashcard.decks.length === 1,
  );
  // remove deletable flashcards from studyProfile
  listOfUniqueFlashcards.forEach((flashcard) => {
    studyUtil.removeFlashcardFromStudyObjects(studyProfile.flashcards, flashcard._id);
    studyUtil.removeFlashcardFromStudyObjects(studyProfile.studySession, flashcard._id);
  });

  const update = {
    $pull: { decks: deck._id },
    flashcards: studyProfile.flashcards,
    studySession: studyProfile.studySession,
  };

  if (deck._id.equals(studyProfile.extractionDeck)) {
    update.extractionDeck = null;
  }

  // remove deck from studyProfile
  await StudyProfile.findByIdAndUpdate(studyProfile._id, update);
  // delete unique flashcards
  await Flashcard.deleteMany({ _id: { $in: listOfUniqueFlashcards } });
  // remove deck from non-unique flashcards
  await Flashcard.updateMany({ 'decks.deckId': deck._id }, { $pull: { decks: { deckId: deck._id } } });
  // delete deck
  await Deck.findByIdAndDelete(deck._id);
  return deck;
};

const updateDeckLearningProgress = async (flashcard) => {
  Promise.all(
    flashcard.decks.map(async (deckInfo) => {
      const { freq, deckId } = deckInfo;
      await Deck.findOneAndUpdate({ _id: deckId }, { $inc: { coverage: freq, vocabLearned: 1 } });
    }),
  );
};

const updateBookProgress = async (userId, deckId, pageProgress) => {
  const studyProfile = await Validator.getValidatedStudyProfileByUserId(userId);
  const deck = await (await Validator.getValidatedDeck(deckId)).populate('book');

  if (!deck.studyProfile.equals(studyProfile._id)) {
    const error = new Error('Deck does not belong to user');
    error.status = 403;
    throw error;
  }

  if (pageProgress > deck.book.pages || pageProgress < 0) {
    const error = new Error(
      `Invalid pageProgress ${pageProgress}. Must be non-negative and not exceed the books page count: ${deck.book.pages}`,
    );
    error.status = 400;
    throw error;
  }
  await Deck.findByIdAndUpdate(deck._id, { bookProgress: pageProgress });
};

module.exports = {
  createBookDeck,
  reassignDeck,
  setExtractionDeck,
  deleteDeck,
  updateBookProgress,
  updateDeckLearningProgress,
};
