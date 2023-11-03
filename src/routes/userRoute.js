const express = require('express');
const userController = require('../controllers/userController');

const userRoutes = express.Router();
const { authenticateToken } = require('../middleware/authentication');
const upload = require('../middleware/multer');

userRoutes.get('/:id', userController.getUserbyID);

userRoutes.patch('/profile', authenticateToken, userController.updateUserProfile);
userRoutes.patch('/reset-password', authenticateToken, userController.resetPassword);

userRoutes.post('/register', userController.registerUser);
userRoutes.post('/login', userController.loginUser);
userRoutes.post('/logout', userController.logoutUser);
userRoutes.post('/profile/image', authenticateToken, upload.single('image'), userController.uploadProfileImage);
// userRoutes.post('/forgot-password', userController.forgotPassword);

module.exports = userRoutes;
