const mongoose = require('mongoose');

// sub-document for BookSchema
const VocabSchema = new mongoose.Schema({
  lexicalEntryId: { type: mongoose.Types.ObjectId, ref: 'LexicalEntry' },
  lemma: { type: String, required: true },
  pos: { type: String, required: true },
  freq: { type: Number, required: true },
});

const BookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  pages: { type: Number, required: true },
  isbn: { type: String, required: true },
  publicationDate: { type: Date, required: true },
  coverImage: { type: String },
  totalWords: { type: Number, required: true },
  uniqueWords: { type: Number, required: true },
  genres: { type: [String] },
  difficulty: {
    type: Number, required: true, min: 0, max: 10,
  },
  affiliateLink: { type: String, required: true },
  averageRating: {
    type: Number, required: true, default: 0, min: 0, max: 5,
  },
  vocabList: [VocabSchema],
  users: {
    finished: [{ type: mongoose.Types.ObjectId, ref: 'User' }],
    reading: [{ type: mongoose.Types.ObjectId, ref: 'User' }],
    wantToRead: [{ type: mongoose.Types.ObjectId, ref: 'User' }],
  },
  reviews: [{ type: mongoose.Types.ObjectId, ref: 'Review' }],
  createdAt: { type: Date, required: true },
});

const BookModel = mongoose.model('Book', BookSchema);
module.exports = { Book: BookModel };
