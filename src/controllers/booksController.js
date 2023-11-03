const { Book } = require('../models/book');
const logger = require('../logger');
const bookService = require('../services/bookService');

async function getAllBooks(req, res, next) {
  try {
    const getPopularity = (book) =>
      book.users.finished.length + book.users.reading.length + book.users.wantToRead.length;
    const books = (await Book.find({}, { vocabList: 0 })).sort((a, b) => {
      const aPopularity = getPopularity(a);
      const bPopularity = getPopularity(b);
      return bPopularity - aPopularity;
    });

    res.status(200).json(books);
  } catch (err) {
    next(err);
  }
}

async function getBookByID(req, res, next) {
  try {
    const bookId = req.params.book_id;
    const userId = req.user?._id;

    const book = await bookService.getBookByID(bookId, userId);
    res.json(book);
  } catch (err) {
    next(err);
  }
}

async function getBookLearningProgress(req, res, next) {
  try {
    const bookId = req.params.book_id;
    const userId = req.user?._id;

    const stats = await bookService.getBookLearningProgress(bookId, userId);
    res.status(200).json(stats);
  } catch (err) {
    next(err);
  }
}

async function getBookByGenre(req, res, next) {
  try {
    const queryGenres = req.query.genres.split(',');

    const books = await Book.find({}, { vocabList: 0 });

    const filteredBooks = books.filter((book) => {
      const caseInsensitiveMatch = new RegExp(book.genres.join('|'), 'i');
      return queryGenres.some((genre) => caseInsensitiveMatch.test(genre));
    });

    res.status(200).json(filteredBooks);
  } catch (err) {
    next(err);
  }
}

// eslint-disable-next-line consistent-return
async function getBooksByTitleOrAuthor(req, res, next) {
  try {
    const { searchText } = req.query;

    if (!searchText || typeof searchText !== 'string') {
      logger.warn('Query parameter name missing');
      return res.status(400).message('Missing query parameter name');
    }

    const regexString = new RegExp(`^${searchText}`, 'i');
    const books = await Book.find(
      {
        $or: [{ title: regexString }, { author: regexString }],
      },
      { vocabList: 0 }
    );

    const sortedBooks = books.sort((a, b) => a.title.length - b.title.length);

    res.status(200).json(sortedBooks);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllBooks,
  getBookByID,
  getBookByGenre,
  getBooksByTitleOrAuthor,
  getBookLearningProgress,
};
