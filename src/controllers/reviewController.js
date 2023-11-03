const { Review } = require('../models/review');
const reviewService = require('../services/reviewService');

async function getAllReviews(req, res, next) {
  try {
    let reviews = await Review.find({}).populate('book');
    reviews = reviews.sort((a, b) => {
      // sort by descending generalRating, then by earliest date
      if (a.generalRating - b.generalRating === 0) {
        return b.date - a.date;
      }
      return b.generalRating - a.generalRating;
    });

    reviews = reviews.map((review) => reviewService.addBookDetails(review));

    res.json(reviews);
  } catch (err) {
    next(err);
  }
}

const getReviewById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let review = await Review.findById(id).populate('book');

    if (!review) {
      const error = new Error(`Review with id: ${id} does not exist`);
      error.status = 404;
      throw error;
    }

    review = reviewService.addBookDetails(review);
    res.status(200).json(review);
  } catch (err) {
    next(err);
  }
};

const getReviewsByUserId = async (req, res, next) => {
  try {
    const { userId } = req.params;
    let reviews = await Review.find({ user: userId }).populate('book');
    reviews = reviews.map((review) => reviewService.addBookDetails(review));

    res.json(reviews);
  } catch (err) {
    next(err);
  }
};

async function createReview(req, res, next) {
  try {
    const { user } = req;
    const reqReview = req.body.review;

    const newReview = await reviewService.createReview(reqReview, user);

    res.status(201).json(newReview);
  } catch (err) {
    next(err);
  }
}

async function updateReview(req, res, next) {
  try {
    const { user } = req;
    let updatedReview = req.body.review;
    const reviewId = req.params.id;

    updatedReview = await reviewService.updateReviewById(updatedReview, reviewId, user);

    res.json(updatedReview);
  } catch (err) {
    next(err);
  }
}

async function deleteReview(req, res, next) {
  try {
    const { id } = req.params;
    const { user } = req;

    const deletedReview = await reviewService.deleteReviewById(id, user);

    res.status(200).json(deletedReview);
  } catch (err) {
    next(err);
  }
}

async function likeReview(req, res, next) {
  try {
    const { user } = req;
    const reviewId = req.params.id;

    await reviewService.likeReviewById(reviewId, user);

    res.status(200).send('Liked review');
  } catch (err) {
    next(err);
  }
}

async function removeLikedReview(req, res, next) {
  try {
    const { user } = req;
    const reviewId = req.params.id;

    await reviewService.removeLikedReviewById(reviewId, user);

    res.status(200).send('Undone like review');
  } catch (err) {
    next(err);
  }
}

async function dislikeReview(req, res, next) {
  try {
    const { user } = req;
    const reviewId = req.params.id;

    await reviewService.dislikeReviewById(reviewId, user);

    res.status(200).send('Dislike review');
  } catch (err) {
    next(err);
  }
}

async function removeDislikedReview(req, res, next) {
  try {
    const { user } = req;
    const reviewId = req.params.id;

    await reviewService.removeDislikedReviewById(reviewId, user);

    res.status(200).send('Undone dislike review');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllReviews,
  getReviewById,
  getReviewsByUserId,
  createReview,
  updateReview,
  deleteReview,
  likeReview,
  dislikeReview,
  removeLikedReview,
  removeDislikedReview,
};
