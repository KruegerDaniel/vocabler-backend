const mongoose = require('mongoose');
const { deckTypeEnum } = require('../util/enum');

const DeckSchema = new mongoose.Schema({
  book: { type: mongoose.Types.ObjectId, required: true, ref: 'Book' },
  title: { type: String, required: true },
  coverImage: { type: String, required: true },
  studyProfile: { type: mongoose.Types.ObjectId, required: true, ref: 'StudyProfile' },
  deckType: { type: String, enum: Object.values(deckTypeEnum), required: true },
  vocabLearned: { type: Number },
  coverage: { type: Number },
  uniqueWords: { type: Number, required: true },
  totalWords: { type: Number, required: true },
  bookProgress: { type: Number, min: 0, default: 0 },
  createdAt: { type: Date, default: Date.now() },
});

const DeckModel = mongoose.model('Deck', DeckSchema);

module.exports = { Deck: DeckModel };
