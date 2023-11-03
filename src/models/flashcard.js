const mongoose = require('mongoose');

const FlashcardSchema = new mongoose.Schema({
  dueDate: { type: Date, default: Date.now() },
  lexicalEntryId: { type: mongoose.Types.ObjectId, required: true, ref: 'LexicalEntry' },
  pos: { type: String, required: true },
  studyHistory: { type: [String], default: [] },
  studyLevel: { type: Number, default: -1 },
  decks: [
    {
      _id: { type: mongoose.Types.ObjectId, auto: false },
      deckId: { type: mongoose.Types.ObjectId, ref: 'Deck' },
      deckTitle: { type: String },
      freq: { type: Number, default: 1 }, // freq within the given deck
    },
  ],
  freqCorpus: { type: Number, default: 1 }, // freq of all decks together
  createdAt: { type: Date, default: Date.now() },
});

const FlashCardModel = mongoose.model('Flashcard', FlashcardSchema);

module.exports = { Flashcard: FlashCardModel };
