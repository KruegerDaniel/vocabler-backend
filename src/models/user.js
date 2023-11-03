const mongoose = require('mongoose');
const { userRoleEnum, subscriptionPlanEnum } = require('../util/enum');
const config = require('../config');

const addressSchema = new mongoose.Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  country: { type: String, required: true },
  postalCode: { type: String, required: true },
  state: { type: String },
});

const subscriptionProfileSchema = new mongoose.Schema({
  stripeSubscriptionId: { type: String },
  subscriptionStartDate: { type: Date },
  nextPaymentDate: { type: Date },
  subscriptionPlan: { type: String, enum: Object.values(subscriptionPlanEnum) },
  discount: { type: Number },
  unitAmount: { type: Number }, // in cents as per stripe docs
  payments: { type: [mongoose.Types.ObjectId], ref: 'Payment' },
  stripeCustomer: {
    // follows customer_details from checkout session object in documentation
    // ref: https://stripe.com/docs/api/checkout/sessions/object#checkout_session_object-customer_details
    fullName: { type: String },
    email: { type: String },
    stripeCustomerId: { type: String },
    address: { type: addressSchema },
    phone: { type: String },
  },
});

const userSchema = new mongoose.Schema({
  username: {
    type: String, required: true, maxLength: 50, minLength: 1,
  },
  email: {
    type: String, required: true, maxLength: 50, minLength: 1, unique: true,
  },
  password: { type: String, required: true },
  registrationDate: { type: Date, default: Date.now(), required: true },
  trialDueDate: {
    type: Date,
    required: true,
    default: () => {
      // sets trialDueDate to 30 days from now
      const currentDate = new Date();
      const date = new Date(currentDate);
      date.setDate(currentDate.getDate() + config.TRIAL_LENGTH_DAYS);
      return date;
    },
  },
  profileImage: { type: String, required: true, default: 'default.png' },
  description: {
    type: String,
    default: 'No description given',
    required: true,
    maxLength: 1000,
  },
  userRole: { type: String, enum: Object.values(userRoleEnum), default: userRoleEnum.TRIAL },
  bookList: {
    finished: { type: [mongoose.Types.ObjectId], ref: 'Book' },
    reading: { type: [mongoose.Types.ObjectId], ref: 'Book' },
    wantToRead: { type: [mongoose.Types.ObjectId], ref: 'Book' },
  },
  studyProfile: { type: mongoose.Types.ObjectId, ref: 'StudyProfile' },
  reviews: { type: [mongoose.Types.ObjectId], ref: 'Review' },
  subscriptionProfile: { type: subscriptionProfileSchema },
});

const UserModel = mongoose.model('User', userSchema);

module.exports = { User: UserModel };
