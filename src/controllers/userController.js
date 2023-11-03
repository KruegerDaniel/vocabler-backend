const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { unlink } = require('node:fs/promises');
const { User } = require('../models/user');
const { StudyProfile } = require('../models/studyProfile');
const reviewService = require('../services/reviewService');
const { SALT_ROUNDS, JWT_SECRET, JWT_EXPIRATION_TIME } = require('../config');
const logger = require('../logger');

// create jwt token and return it in a cookie
const genToken = (res, user) => {
  const token = jwt.sign(
    {
      userId: user._id,
      username: user.username,
      email: user.email,
      userRole: user.userRole,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRATION_TIME,
    }
  );

  res.cookie('jwt', token, {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: JWT_EXPIRATION_TIME * 1000, // ms
  });
  return token;
};

async function getUserbyID(req, res, next) {
  try {
    const { id } = req.params;
    // hide important user information from client
    const user = await User.findById(id, {
      email: 0,
      password: 0,
      __v: 0,
      subscriptionProfile: 0,
      studyProfile: 0,
    });

    if (!user) {
      const error = new Error(`User with id: ${id} does not exist`);
      error.status = 404;
      throw error;
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
}

async function registerUser(req, res) {
  let newUser = new User(req.body.user);
  const validationError = newUser.validateSync();

  try {
    if (validationError) {
      const error = new Error(`Invalid User object: ${validationError.message}}`);
      error.status = 400;
      throw error;
    }
    const existingUser = await User.findOne({ email: newUser.email });
    if (existingUser) {
      const error = new Error(`Existing user with email: ${newUser.email} already exists`);
      error.status = 409;
      throw error;
    }

    // hash password
    const { password } = newUser;
    const hashedPassword = bcrypt.hashSync(password, SALT_ROUNDS);
    newUser.password = hashedPassword;

    // save new User
    newUser = await newUser.save();

    // create studyprofile
    const studyProfile = await StudyProfile.create({ user: newUser._id });

    newUser = await User.findOneAndUpdate(
      { _id: newUser._id },
      { $set: { studyProfile: studyProfile._id } },
      { new: true }
    );

    // create jwt
    const token = genToken(res, newUser);

    return res.status(201).json({
      _id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      userRole: newUser.userRole,
      jwt: token,
    });
  } catch (err) {
    logger.error(err);
    return res.status(400).json({ error: 'Bad request', message: 'Registration failed' });
  }
}

async function loginUser(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    logger.error(`No existing user with email: ${email} is found`);
    return res.status(404).json({ error: 'Not Found', message: 'Cannot find user' });
  }

  try {
    // compare the given password with the stored hashed password
    if (await bcrypt.compare(password, user.password)) {
      const token = genToken(res, user);

      return res.status(200).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        userRole: user.userRole,
        jwt: token,
        profilePic: user.profileImage,
      });
    }
    logger.error('Password does not match with the email');
    return res.status(401).json({ error: 'Unauthorized', message: 'Wrong password' });
  } catch (err) {
    logger.error(err);
    return res.status(400).json({ error: 'Bad request', message: 'Log-In failed' });
  }
}

async function logoutUser(req, res) {
  try {
    res.cookie('jwt', '', {
      httpOnly: true,
      expires: new Date(0),
    });

    return res.status(200).json({ message: 'Log Out Successful' });
  } catch (err) {
    logger.error(err);
    return res.status(400).json({ error: 'Bad request', message: 'Log-Out failed' });
  }
}

const uploadProfileImage = async (req, res, next) => {
  const { user } = req;
  try {
    if (req.file) {
      // update user profileImage
      const imagePath = `images/profile/${req.file.filename}`;
      await User.findOneAndUpdate(user._id, { $set: { profileImage: imagePath } });

      // delete old profileImage from server
      if (user.profileImage !== 'default.png') {
        unlink(`./public/${user.profileImage}`, (err) => {
          if (err) {
            logger.error(err);
          }
        });
      }

      // make sure reviews receive new userDetails
      await reviewService.updateUserDetailsForUser(user, user.username, imagePath);
      res.status(200).json({ image: imagePath });
    } else {
      const error = new Error('No image file found');
      error.status = 400;
      throw error;
    }
  } catch (error) {
    logger.error(error);
    next(error);
  }
};

const updateUserProfile = async (req, res, next) => {
  try {
    const { user } = req;
    const { username, email, description } = req.body;
    if (typeof username !== 'string' || typeof email !== 'string' || typeof description !== 'string') {
      const error = new Error('Invalid request body');
      error.status = 400;
      throw error;
    }

    // update while running validators to make sure to adhere to max/min length
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $set: { username, email, description } },
      { runValidators: true, new: true }
    );
    // make sure reviews receive new userDetails
    await reviewService.updateUserDetailsForUser(user, username, user.profileImage);
    const token = genToken(res, updatedUser);
    res.status(200).json({ jwtToken: token });
  } catch (error) {
    logger.error(error);
    next(error);
  }
};

async function resetPassword(req, res, next) {
  const { newPassword, oldPassword } = req.body;
  const { user } = req;
  try {
    const userPassword = (await User.findById(user._id)).password;

    if (!(await bcrypt.compare(oldPassword, userPassword))) {
      const error = new Error('Old password does not match');
      error.status = 400;
      throw error;
    }

    const password = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await User.findOneAndUpdate({ _id: user._id }, { $set: { password } });
    logger.info(`User ${user._id} password reset`);

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getUserbyID,
  registerUser,
  loginUser,
  logoutUser,
  resetPassword,
  updateUserProfile,
  uploadProfileImage,
};
