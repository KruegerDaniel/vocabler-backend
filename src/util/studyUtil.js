const logger = require('../logger');
const { Flashcard } = require('../models/flashcard');
const { reviewIntervalLengthEnum, answerEnum } = require('./enum');
const util = require('./utilMethods');

// 1min, 10min, 1d, 3d, 7d, 16d, 35d
const optimalIntervals = [1, 10, 1440, 4320, 10_080, 23_040, 50_400]; // interval in minutes

const convertAnswerToNewLevel = (oldLevel, answer) => {
  let newLevel;
  switch (answer) {
    case answerEnum.FORGOT:
      newLevel = -1;
      break;
    case answerEnum.HARD:
      newLevel = oldLevel - 1;
      break;
    case answerEnum.GOOD:
      newLevel = oldLevel + 1;
      break;
    case answerEnum.EASY:
      newLevel = oldLevel + 2;
      break;
    default:
      logger.error(`Unknown answer: ${answer}`);
      newLevel = oldLevel;
  }
  // keep in range of (-1,5)
  newLevel = newLevel < -1 ? -1 : newLevel;
  newLevel = newLevel > 5 ? 5 : newLevel;

  return newLevel;
};

const calculateNewDueDate = (newLevel, intervalModifier) => {
  // map newLevel to proper index of optimalIntervals 0-6
  const index = newLevel <= 0 ? newLevel + 1 : newLevel - 1;
  if (index < 0 || index >= optimalIntervals.length) {
    logger.error(`New study level: ${index} is out of range`);
    throw new Error(`New study level: ${index} is out of range`);
  }

  const days = Math.ceil(optimalIntervals[index] * intervalModifier);
  const newDate = new Date();
  newDate.setTime(newDate.getTime() + days * 60 * 1000); // Add minutes (in ms) from now
  return newDate;
};

/**
 * Remove satellite adjective from lexicalEntry and merge it with adjective.
 * Satellite adjectives are custom fields in wordnet which can be seen as normal adjectives
 * @param {lexicalEntry} lexicalEntry
 * @returns lexicalEntry with satellite merged into adjective
 */
const mergeAdjectiveSatellite = (lexicalEntry) => {
  const lexicalEntryObject = lexicalEntry.toObject();
  if (lexicalEntryObject.s) {
    const { definitions, examples, freqRank } = lexicalEntryObject.s;
    if (lexicalEntryObject.a) {
      lexicalEntryObject.a.definitions = [...definitions, ...lexicalEntryObject.a.definitions];
      lexicalEntryObject.a.examples = [...examples, ...lexicalEntryObject.a.examples];
    } else {
      lexicalEntryObject.a = { definitions, examples, freqRank };
    }
    delete lexicalEntryObject.s;
  }
  return lexicalEntryObject;
};

/**
 * Works for both studySession or studyProfile.flashcards
 */
const reassignFlashcard = (studyObject, flashcardId, fieldName) => {
  util.reassignIdInObject(studyObject, flashcardId, fieldName);
};

const removeFlashcardFromStudyObjects = (studyObject, flashcardId) => {
  util.removeIdFromObject(studyObject, flashcardId);
};

const addFlashcardToStudyObject = (studyObject, flashcardId, fieldName) => {
  util.addIdToObject(studyObject, flashcardId, fieldName);
};

const getNewFlashcardProgress = (flashcard, answer, studyConfig) => {
  const { studyLevel, studyHistory } = flashcard;
  const reviewIntervalLength = reviewIntervalLengthEnum.get(studyConfig.reviewIntervalLength);

  const newStudyHistory = [...studyHistory, answer];
  const newLevel = convertAnswerToNewLevel(studyLevel, answer);
  const newDate = calculateNewDueDate(newLevel, reviewIntervalLength);

  return { newLevel, newDate, studyHistory: newStudyHistory };
};

const getStudySessionStats = (studySession, studyConfig) => {
  const { repeatCards, startTime, endTime } = studySession;
  const { newCards } = studySession;
  const { reviewCards } = studySession;

  const mergedIds = [...(reviewCards || []), ...(newCards || [])];
  const newCardsCompleted = newCards ? studyConfig.newCardsPerSession - newCards.length : 0;
  const reviewCardsCompleted = reviewCards ? studyConfig.maxReviewCardsPerSession - reviewCards.length : 0;

  if (new Date() > endTime) {
    return {
      newCardsCompleted,
      reviewCardsCompleted,
      studyTime: studyConfig.studySessionDuration,
    };
  }

  if (mergedIds.length === 0 && repeatCards.length === 0) {
    return {
      newCardsCompleted,
      reviewCardsCompleted,
      studyTime: new Date() - startTime,
    };
  }
  return null;
};

/**
 * Bulk create new flashcards and map them to the new deck.
 * New flashcards are created only if flashcards with lemma pos do not exist yet.
 * @param {Book} book vocablist is used to identify non-existent flashcards
 * @param {Deck} deck new flashcards mapped to the new deck
 * @param {[Flashcard]} allExistingFlashcards list of all existing flashcards
 * @returns list of IDs of new flashcards
 */
const createNewFlashcards = async (book, deck, allExistingFlashcards) => {
  const listOfNewFlashcards = await Promise.all(
    book.vocabList
      .filter(
        (vocab) =>
          !allExistingFlashcards.some(
            (flashcard) => flashcard.lexicalEntryId.equals(vocab.lexicalEntryId) && flashcard.pos === vocab.pos
          )
      )
      .map((vocab) =>
        Flashcard.create({
          lexicalEntryId: vocab.lexicalEntryId,
          pos: vocab.pos,
          decks: { deckId: deck._id, deckTitle: deck.title, freq: vocab.freq },
          freqCorpus: vocab.freq,
        })
      // eslint-disable-next-line function-paren-newline
      )
  );
  return listOfNewFlashcards.map((flashcard) => flashcard._id);
};

const createNewFlashcardsStudyProfile = async (book, deck, studyProfile) => {
  const { flashcards } = studyProfile;

  // create flashcards for non-existing
  const allExistingFlashcardIds = [
    ...flashcards.new,
    ...flashcards.perfected,
    ...flashcards.toStudy,
    ...flashcards.blacklist,
  ];
  const allExistingFlashcards = await Flashcard.find({
    _id: { $in: allExistingFlashcardIds },
  });
  return createNewFlashcards(book, deck, allExistingFlashcards);
};

module.exports = {
  addFlashcardToStudyObject,
  removeFlashcardFromStudyObjects,
  reassignFlashcard,
  calculateNewDueDate,
  convertAnswerToNewLevel,
  getStudySessionStats,
  createNewFlashcards,
  createNewFlashcardsStudyProfile,
  mergeAdjectiveSatellite,
  getNewFlashcardProgress,
};
