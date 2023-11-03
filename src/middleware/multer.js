const path = require('path');
const multer = require('multer');

const config = require('../config');

/**
 * ref: https://www.makeuseof.com/upload-image-in-nodejs-using-multer/
 */

const storageEngine = multer.diskStorage({
  destination: config.IMAGE_DESTINATION,
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const checkFileType = (file, cb) => {
  // Allowed file extensions
  const fileTypes = /jpeg|jpg|png|gif|svg/;

  // check extension names
  const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());

  const mimeType = fileTypes.test(file.mimetype);

  if (mimeType && extName) {
    return cb(null, true);
  }
  return cb('Error: You can Only Upload Images!!');
};

const upload = multer({
  storage: storageEngine,
  limits: {
    fileSize: config.MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    checkFileType(file, cb);
  },
});

module.exports = upload;
