const mongoose = require('mongoose');

const ratingValidator = {
  validator: (value) => Number.isInteger(value / 0.5),
  message: '{VALUE} is not a multiple of 0.5',
};

const bodyValidator = {
  validator: (body) => body.trim().length >= 1,
  message: '{body} should not be empty/whitespace character',
};

const ReviewSchema = new mongoose.Schema({
  body: {
    type: String, required: true, minlength: 1, validate: bodyValidator,
  },
  entertainmentRating: {
    type: Number, min: 0, max: 5, validate: ratingValidator,
  },
  educationalRating: {
    type: Number, min: 0, max: 5, validate: ratingValidator,
  },
  generalRating: {
    type: Number, required: true, min: 0, max: 5, validate: ratingValidator,
  },
  likes: [{ type: mongoose.Types.ObjectId, required: true, ref: 'User' }],
  dislikes: [{ type: mongoose.Types.ObjectId, required: true, ref: 'User' }],
  date: { type: Date, required: true, default: Date.now() },
  book: { type: mongoose.Types.ObjectId, required: true, ref: 'Book' },
  user: { type: mongoose.Types.ObjectId, required: true, ref: 'User' },
  userDetails: {
    username: { type: String, required: true },
    profileImage: { type: String, required: true },
  },
  createdAt: { type: Date, default: Date.now() },
});

const ReviewModel = mongoose.model('Review', ReviewSchema);

module.exports = { Review: ReviewModel };
