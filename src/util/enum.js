const reviewIntervalLengthEnum = new Map([
  ['LONGEST', 2],
  ['LONGER', 1.5],
  ['STANDARD', 1],
  ['SHORTER', 0.75],
  ['SHORTEST', 0.5],
]);

const userRoleEnum = Object.freeze({
  PREMIUM: 'USERROLE_PREMIUM',
  TRIAL: 'USERROLE_TRIAL',
  ADMIN: 'USERROLE_ADMIN',
  FREE: 'USERROLE_FREE',
});

const cardLearningOrderEnum = Object.freeze({
  MOST_FREQUENT_WITHIN_DECK: 'MOST_FREQUENT_WITHIN_DECK',
  MOST_FREQUENT_WITHIN_CORPUS: 'MOST_FREQUENT_WITHIN_CORPUS',
  LEAST_FREQUENT_WITHIN_DECK: 'LEAST_FREQUENT_WITHIN_DECK',
  LEAST_FREQUENT_WITHIN_CORPUS: 'LEAST_FREQUENT_WITHIN_CORPUS',
});

const answerEnum = Object.freeze({
  FORGOT: 'FORGOT',
  HARD: 'HARD',
  GOOD: 'GOOD',
  EASY: 'EASY',
  PERFECTED: 'PERFECTED',
  BLACKLIST: 'BLACKLIST',
});

const deckTypeEnum = Object.freeze({
  FINISHED: 'FINISHED',
  STUDYING: 'STUDYING',
  WISHLIST: 'WISHLIST',
});

const subscriptionPlanEnum = Object.freeze({
  MONTHLY: 'price_1NOm8HI7ip5F2O7En0G7kBld',
  YEARLY: 'price_1NOmKEI7ip5F2O7El0mmP97o',
});

const defaultStudyConfig = {
  reviewIntervalLength: 'STANDARD',
  cardLearningOrder: cardLearningOrderEnum.MOST_FREQUENT_WITHIN_DECK,
  newCardsPerSession: 10,
  maxReviewCardsPerSession: 20,
  studySessionDuration: 3600,
};

module.exports = {
  reviewIntervalLengthEnum,
  defaultStudyConfig,
  answerEnum,
  cardLearningOrderEnum,
  deckTypeEnum,
  subscriptionPlanEnum,
  userRoleEnum,
};
