const stripeImport = require('stripe');
const config = require('../config');

const logger = require('../logger');

const stripe = stripeImport(config.STRIPE_SECRET_KEY);
const { userRoleEnum, subscriptionPlanEnum } = require('../util/enum');
const { User } = require('../models/user');

const createCustomer = async (userId, customerId, customerDetails) => {
  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        'subscriptionProfile.stripeCustomer': {
          stripeCustomerId: customerId,
          fullName: customerDetails.name,
          address: {
            city: customerDetails.address.city,
            country: customerDetails.address.country,
            street: customerDetails.address.line1,
            postalCode: customerDetails.address.postal_code,
            state: customerDetails.address.state,
          },
          email: customerDetails.email,
          phone: customerDetails.phone,
        },
      },
    },
    { new: true }
  );

  return user;
};

const saveSubscription = async (user, subscription) => {
  const update = {};
  // set userRole to Premium
  if (userRoleEnum.ADMIN === user.userRole) {
    logger.info(`User ${user._id} is an admin. Ignoring upgrade`);
  } else {
    // also add upcoming subscription date
    update.userRole = userRoleEnum.PREMIUM;
    logger.info(`Successfully upgraded user ${user._id} to premium`);
  }

  const priceId = subscription.items.data[0].price.id;
  const plan = Object.entries(subscriptionPlanEnum).find(([, value]) => value === priceId)[0];

  // save other info
  update.$set = {
    'subscriptionProfile.stripeSubscriptionId': subscription.id,
    'subscriptionProfile.subscriptionStartDate': new Date(subscription.start_date * 1000),
    'subscriptionProfile.subscriptionPlan': plan,
    'subscriptionProfile.nextPaymentDate': new Date(subscription.current_period_end * 1000),
    'subscriptionProfile.discount': subscription.discount,
    'subscriptionProfile.unitAmount': subscription.items.data[0].price.unit_amount / 100,
  };
  await User.findByIdAndUpdate(user._id, update);
};

const cancelSubscription = async (user) => {
  const { stripeSubscriptionId } = user.subscriptionProfile;
  if (!stripeSubscriptionId) {
    logger.error(`User ${user._id} does not have a subscription!`);
    const error = new Error('User does not have a subscription');
    error.status = 400;
    throw error;
  }

  const subscription = await stripe.subscriptions.update(stripeSubscriptionId, { cancel_at_period_end: true });

  return subscription;
};

const removeSubscription = async (user) => {
  const update = {};

  // downgrade userRole to Free
  if (userRoleEnum.ADMIN === user.userRole) {
    logger.info(`User ${user._id} is an admin. Ignoring downgrade`);
  } else {
    update.userRole = userRoleEnum.FREE;
  }

  // remove subscription info
  update.$set = {
    'subscriptionProfile.stripeSubscriptionId': null,
    'subscriptionProfile.subscriptionStartDate': null,
    'subscriptionProfile.subscriptionPlan': null,
    'subscriptionProfile.nextPaymentDate': null,
    'subscriptionProfile.discount': null,
    'subscriptionProfile.totalAmount': null,
  };

  await User.findByIdAndUpdate(user._id, update);
};

module.exports = {
  createCustomer,
  saveSubscription,
  cancelSubscription,
  removeSubscription,
};
