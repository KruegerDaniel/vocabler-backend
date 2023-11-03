const { StudyProfile } = require('../models/studyProfile');
const { Flashcard } = require('../models/flashcard');
const { LexicalEntry } = require('../models/lexicalEntry');
const deckService = require('./deckService');
const studyUtil = require('../util/studyUtil');

const { cardLearningOrderEnum, answerEnum } = require('../util/enum');
const Validator = require('../util/validate');
const { Review } = require('../models/review');

async function extractNewStudyFlashcards(flashcardIds, extractionDeckId, studyConfig) {
  const allNewFlashcards = await Flashcard.find({
    _id: { $in: flashcardIds },
    decks: { $elemMatch: { deckId: extractionDeckId } },
  });
  const flashcardFrequencies = allNewFlashcards.map((flashcard) => {
    const currentDeck = flashcard.decks.find((deck) => deck.deckId.equals(extractionDeckId));
    return {
      _id: flashcard._id,
      pos: flashcard.pos,
      decks: currentDeck,
      freqCorpus: flashcard.freqCorpus,
    };
  });

  let sortedFunction;
  switch (studyConfig.cardLearningOrder) {
    case cardLearningOrderEnum.MOST_FREQUENT_WITHIN_DECK:
      sortedFunction = (a, b) => b.decks.freq - a.decks.freq;
      break;
    case cardLearningOrderEnum.MOST_FREQUENT_WITHIN_CORPUS:
      sortedFunction = (a, b) => b.freqCorpus - a.freqCorpus;
      break;
    case cardLearningOrderEnum.LEAST_FREQUENT_WITHIN_DECK:
      sortedFunction = (a, b) => a.decks.freq - b.decks.freq;
      break;
    case cardLearningOrderEnum.LEAST_FREQUENT_WITHIN_CORPUS:
      sortedFunction = (a, b) => a.freqCorpus - b.freqCorpus;
      break;
    default: {
      const error = new Error(`Unknown CardLearningOrder used: ${studyConfig.cardLearningOrder}`);
      error.status = 400;
      throw error;
    }
  }

  const endIndex =
    studyConfig.newCardsPerSession > allNewFlashcards.length ? allNewFlashcards.length : studyConfig.newCardsPerSession;
  return flashcardFrequencies.sort(sortedFunction).slice(0, endIndex);
}

async function extractReviewStudyFlashcards(flashcardIds, studyConfig) {
  const allReviewFlashcards = (await Flashcard.find({ _id: { $in: flashcardIds } })).filter(
    (flashcard) => flashcard.dueDate <= new Date()
  );
  const endIndex =
    studyConfig.maxReviewCardsPerSession > allReviewFlashcards.length
      ? allReviewFlashcards.length
      : studyConfig.maxReviewCardsPerSession;
  return allReviewFlashcards.sort((a, b) => a.dueDate - b.dueDate).slice(0, endIndex);
}

/**
 * Will randomly select a new/review flashcard. If a repeatCard is due, it will be prioritized.
 */
async function retrieveNextStudyObject(studySession) {
  const { repeatCards } = studySession;
  const { newCards } = studySession;
  const { reviewCards } = studySession;

  const mergedIds = [...(reviewCards || []), ...(newCards || [])];

  const dueRepeatCards = (await Flashcard.find({ _id: { $in: repeatCards } })).filter(
    // we need this, in case all newCards are done and we have only repeatCards left
    (flashcard) => flashcard.dueDate < new Date() || newCards.length === 0
  );

  let nextFlashcard;
  if (dueRepeatCards.length > 0) {
    [nextFlashcard] = dueRepeatCards;
  } else {
    const mergedFlashcards = await Flashcard.find({ _id: { $in: mergedIds } });
    const randIndex = Math.floor(Math.random() * mergedFlashcards.length);
    nextFlashcard = mergedFlashcards[randIndex];
  }

  return nextFlashcard;
}

const getStudySessionFlashcard = async (userId) => {
  const studyProfile = await Validator.getValidatedStudyProfileByUserId(userId);

  if (studyProfile.decks.length === 0) {
    const error = new Error('You currently have no flashcards. Please add a book deck to library');
    error.status = 400;
    throw error;
  }
  if (!studyProfile.extractionDeck) {
    const error = new Error('No extraction deck selected');
    error.status = 400;
    throw error;
  }
  let studySession = studyProfile.studySession ?? null;
  const { studyConfig } = studyProfile;

  // create a new studySession if non-existent or expired
  if (!studySession) {
    const toStudyCards = studyProfile.flashcards.toStudy;
    const newCards = studyProfile.flashcards.new;

    // fetch new cards and toStudyCards according to config
    let newStudyFlashcards = await extractNewStudyFlashcards(newCards, studyProfile.extractionDeck, studyConfig);
    newStudyFlashcards = newStudyFlashcards.length > 0 ? newStudyFlashcards.map((flashcard) => flashcard._id) : null;
    let newReviewFlashcards = await extractReviewStudyFlashcards(toStudyCards, studyConfig);
    newReviewFlashcards = newReviewFlashcards.length > 0 ? newReviewFlashcards.map((flashcard) => flashcard._id) : null;

    // set start & endStudyTime
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + studyConfig.studySessionDuration * 1000);

    // create study Session
    studySession = {
      startTime,
      endTime,
      newCards: newStudyFlashcards,
      reviewCards: newReviewFlashcards,
      repeatCards: [],
    };
    await StudyProfile.updateOne({ _id: studyProfile._id }, { studySession });
  }

  const sessionStats = studyUtil.getStudySessionStats(studySession, studyConfig);
  if (sessionStats) {
    // statistic was returned. Session is complete, delete studySession
    await StudyProfile.updateOne({ _id: studyProfile._id }, { studySession: null });
    // update all deck learning progress

    return sessionStats;
  }

  let nextFlashcard = await retrieveNextStudyObject(studySession, studyConfig);
  nextFlashcard = await Flashcard.findById(nextFlashcard._id).populate('decks').exec();

  const lexicalEntry = await LexicalEntry.findById(nextFlashcard.lexicalEntryId);
  // const posValues = lexicalEntry[nextFlashcard.pos]?.toObject();
  /* const wordInfo = {
    ...posValues,
    lemma: lexicalEntry.lemma,
    pos: nextFlashcard.pos,
  };
*/
  nextFlashcard = {
    ...nextFlashcard.toObject(),
    wordInfo: studyUtil.mergeAdjectiveSatellite(lexicalEntry),
  };

  delete nextFlashcard.lexicalEntryId;

  return nextFlashcard;
};

const updateSessionFlashcard = async (userId, flashcardId, answer) => {
  const studyProfile = await Validator.getValidatedStudyProfileByUserId(userId);

  if (!studyProfile.studySession) {
    const error = new Error('StudySession has not been started');
    error.status = 400;
    throw error;
  }

  const flashcard = await Validator.getValidatedFlashcard(flashcardId);

  const { studySession, studyConfig } = studyProfile;

  // handle if blacklist/perfected
  if (answer === answerEnum.BLACKLIST || answer === answerEnum.PERFECTED) {
    // remove from studySession
    studyUtil.removeFlashcardFromStudyObjects(studySession, flashcardId);
    studyUtil.reassignFlashcard(studyProfile.flashcards, flashcardId, answer.toLowerCase());

    await StudyProfile.findByIdAndUpdate(studyProfile._id, { studySession, flashcards: studyProfile.flashcards });
    if (answer === answerEnum.PERFECTED) {
      // update all decks coverage/vocabLearned
      await deckService.updateDeckLearningProgress(flashcard);
    }
    return;
  }

  const { newLevel, newDate, studyHistory } = studyUtil.getNewFlashcardProgress(flashcard, answer, studyConfig);
  await Flashcard.findByIdAndUpdate(flashcardId, { dueDate: newDate, studyLevel: newLevel, studyHistory });

  if (studyHistory.length === 1) {
    // new card move to
    studyUtil.reassignFlashcard(studyProfile.flashcards, flashcardId, 'toStudy');
    studyUtil.reassignFlashcard(studySession, flashcardId, 'repeatCards');
    // update all decks coverage/vocabLearned
    await deckService.updateDeckLearningProgress(flashcard);
  } else if (newLevel >= 0) {
    studyUtil.removeFlashcardFromStudyObjects(studySession, flashcardId);
  } else {
    studyUtil.reassignFlashcard(studySession, flashcardId, 'repeatCards');
  }
  await StudyProfile.findByIdAndUpdate(studyProfile._id, { studySession, flashcards: studyProfile.flashcards });
};

const getStudyStats = async (userId) => {
  const studyProfile = await Validator.getValidatedStudyProfileByUserId(userId);

  const toStudyCards = studyProfile.flashcards.toStudy;
  const newCards = studyProfile.flashcards.new;

  // get flashcard stats
  const allStudyFlashcards = await Flashcard.find({ _id: { $in: toStudyCards } });
  const dueFlashcards = allStudyFlashcards.filter((flashcard) => flashcard.dueDate <= new Date()).length;
  const flashcardsByLevel = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  allStudyFlashcards.forEach((flashcard) => {
    const index = flashcard.studyLevel + 1;
    flashcardsByLevel[index] += 1;
  });
  flashcardsByLevel.perfected = studyProfile.flashcards.perfected.length;

  const studyAndPerfectedCards = [...studyProfile.flashcards.toStudy, ...studyProfile.flashcards.perfected];
  const stats = {
    newCards: newCards.length,
    learnedCards: studyAndPerfectedCards.length,
    cardsDue: dueFlashcards,
    totalCards: studyAndPerfectedCards.length + newCards.length,
    flashcardsByLevel,
  };

  // get book/deck stats
  if (studyProfile.extractionDeck) {
    const deck = await Validator.getValidatedDeck(studyProfile.extractionDeck);
    const book = await Validator.getValidatedBook(deck.book);

    const bookStats = {
      bookId: book._id,
      title: book.title,
      author: book.author,
      pagesRead: deck.bookProgress,
      totalPages: book.pages,
    };

    const review = await Review.findOne({ user: userId, book: book._id });
    if (review) {
      bookStats.rating = review.generalRating;
    }
    stats.bookStats = bookStats;
    stats.extractionDeck = deck;
  }

  return stats;
};

module.exports = { updateSessionFlashcard, getStudySessionFlashcard, getStudyStats };
