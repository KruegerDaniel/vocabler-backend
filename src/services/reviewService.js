const { Book } = require('../models/book');
const { Review } = require('../models/review');
const { User } = require('../models/user');
const { userRoleEnum } = require('../util/enum');
const Validator = require('../util/validate');

function checkAllowedModify(review, user) {
  const userId = user._id;

  if (!userId.equals(review.user) && user.userRole !== userRoleEnum.ADMIN) {
    const error = new Error('User not authorized to modify review');
    error.status = 403;
    throw error;
  }
}

async function calculateAverageRating(bookId, newReview = null) {
  const book = await (await Validator.getValidatedBook(bookId)).populate('reviews');

  const { reviews } = book;
  if (newReview) {
    reviews.push(newReview);
  }
  const avg = reviews.map((review) => review.generalRating).reduce((acc, curr) => acc + curr, 0) / reviews.length;
  return Number.isNaN(avg) ? 0 : avg;
}

const createReview = async (review, user) => {
  const bookId = review.book ?? '';
  const userId = user._id;
  const reviewObject = review;

  // check if book exists
  await Validator.getValidatedBook(bookId);

  const existingReview = await Review.findOne({ user: userId, book: bookId });
  if (existingReview) {
    const error = new Error('Review already exists');
    error.status = 409;
    throw error;
  }

  // add user details
  reviewObject.user = userId;
  reviewObject.userDetails = {
    username: user.username,
    profileImage: user.profileImage,
  };

  // ignore posted likes and dislikes
  delete reviewObject.likes;
  delete reviewObject.dislikes;

  const newReview = await Review.create(reviewObject);
  const newAvg = await calculateAverageRating(bookId, newReview);

  await Book.findByIdAndUpdate({ _id: bookId }, { $push: { reviews: newReview._id }, $set: { averageRating: newAvg } });
  await User.findByIdAndUpdate({ _id: userId }, { $push: { reviews: newReview._id } });

  return newReview;
};

const updateReviewById = async (review, reviewId, user) => {
  await Review.validate(review);

  checkAllowedModify(review, user);

  const reviewObject = review;

  // ignore posted likes and dislikes
  delete reviewObject.likes;
  delete reviewObject.dislikes;

  await Review.findByIdAndUpdate(reviewId, { $set: reviewObject }, { new: true });
  const newAvg = await calculateAverageRating(review.book);
  await Book.findByIdAndUpdate({ _id: review.book }, { $set: { averageRating: newAvg } });

  return review;
};

const deleteReviewById = async (reviewId, user) => {
  const review = await Validator.getValidatedReview(reviewId);

  const bookId = review.book;

  checkAllowedModify(review, user);

  await Book.findByIdAndUpdate(bookId, { $pull: { reviews: review._id } });

  const newAvg = await calculateAverageRating(bookId);
  await Book.findByIdAndUpdate(bookId, { $set: { averageRating: newAvg } });
  await User.findByIdAndUpdate(user._id, { $pull: { reviews: review._id } });
  await Review.findByIdAndDelete(review._id);

  return review;
};

const likeReviewById = async (reviewId, user) => {
  const userId = user._id;
  const review = await Validator.getValidatedReview(reviewId);

  if (userId.equals(review.user)) {
    const error = new Error('User cannot like own review');
    error.status = 400;
    throw error;
  }
  if (review.likes.includes(userId) || review.dislikes.includes(userId)) {
    const error = new Error('User already rated review');
    error.status = 400;
    throw error;
  }

  await Review.findByIdAndUpdate(reviewId, { $push: { likes: userId } });
  return review;
};

const removeLikedReviewById = async (reviewId, user) => {
  const userId = user._id;
  const review = await Validator.getValidatedReview(reviewId);

  if (userId.equals(review.user) || !review.likes.includes(userId)) {
    const error = new Error('User cannot remove like from review');
    error.status = 400;
    throw error;
  }

  await Review.findByIdAndUpdate(reviewId, { $pull: { likes: userId } });

  return review;
};

const dislikeReviewById = async (reviewId, user) => {
  const userId = user._id;
  const review = await Validator.getValidatedReview(reviewId);

  if (userId.equals(review.user)) {
    const error = new Error('User cannot dislike own review');
    error.status = 400;
    throw error;
  }

  if (review.dislikes.includes(userId) || review.likes.includes(userId)) {
    const error = new Error('User already rated review');
    error.status = 400;
    throw error;
  }

  await Review.findByIdAndUpdate(reviewId, { $push: { dislikes: userId } });

  return review;
};

const removeDislikedReviewById = async (reviewId, user) => {
  const userId = user._id;
  const review = await Validator.getValidatedReview(reviewId);

  if (userId.equals(review.user) || !review.dislikes.includes(userId)) {
    const error = new Error('User cannot remove dislike from review');
    error.status = 400;
    throw error;
  }

  await Review.findByIdAndUpdate(reviewId, { $pull: { dislikes: userId } });
  return review;
};

const updateUserDetailsForUser = async (user, newUsername, newProfileImage) => {
  if (user.username === newUsername && user.profileImage === newProfileImage) {
    return; // prevent unnecessary update
  }

  await Review.updateMany(
    { user: user._id },
    { userDetails: { username: newUsername, profileImage: newProfileImage } }
  );
};

const addBookDetails = (review) => {
  const reviewObject = review.toObject();

  const { _id, title, author, coverImage, averageRating } = reviewObject.book;

  const bookDetails = {
    title,
    author,
    coverImage,
    averageRating,
  };
  reviewObject.book = _id;
  return { ...reviewObject, bookDetails };
};

module.exports = {
  addBookDetails,
  createReview,
  updateReviewById,
  deleteReviewById,
  likeReviewById,
  removeLikedReviewById,
  dislikeReviewById,
  removeDislikedReviewById,
  updateUserDetailsForUser,
};
