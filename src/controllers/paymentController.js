const logger = require('../logger');
const subscriptionService = require('../services/subscriptionService');
const { User } = require('../models/user');

// webhook sample code taken from stripe docs (https://stripe.com/docs/webhooks)
const webhook = async (req, res, next) => {
  const event = req.body;

  try {
    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        const user = await User.findOne({ 'subscriptionProfile.stripeCustomer.stripeCustomerId': customerId });
        if (!user) {
          logger.error(`Unable to match upgrade to user! CustomerId: ${customerId}`);
          break;
        }

        await subscriptionService.saveSubscription(user, subscription);

        break;
      }
      case 'customer.subscription.updated': {
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        logger.info(`Subscription ${subscription.id} for user ${subscription.customer} deleted`);

        const user = await User.findOne({
          'subscriptionProfile.stripeCustomer.stripCustomerId': subscription.customer,
        });
        if (!user) {
          logger.error(`Unable to match upgrade to user! CustomerId: ${subscription.customer}`);
          break;
        }

        await subscriptionService.removeSubscription(user);

        break;
      }
      case 'customer.created': {
        const customer = event.data.object;
        logger.info(`New customer created: ${customer.id}`);
        break;
      }
      case 'checkout.session.completed': {
        const checkoutSession = event.data.object;
        logger.info(`New checkout session completed: ${checkoutSession.id}`);
        logger.info('Extracting customer information from checkout session');
        const userId = checkoutSession.client_reference_id;

        const user = await User.findById(userId);
        if (!user) {
          logger.error(`Unable to match upgrade to user! userId: ${userId}`);
          throw new Error('Unable to match upgrade to user!');
        }

        await subscriptionService.createCustomer(user, checkoutSession.customer, checkoutSession.customer_details);
        break;
      }

      default: {
        // ... handle other event types
        logger.info(`Unhandled event type ${event.type}`);
      }
    }
  } catch (error) {
    logger.error(`Webhook Error: ${error.message}, event: ${event.type}`);
    next(error);
  }

  // Return a response to acknowledge receipt of the event
  res.json({ received: true });
};

const getCustomerInfo = async (req, res, next) => {
  const { user } = req;
  try {
    if (!user.subscriptionProfile?.stripeCustomer?.stripeCustomerId) {
      const error = new Error('User does not have a subscription');
      error.status = 400;
      throw error;
    }

    const info = {
      subscriptionInfo: {
        startDate: user.subscriptionProfile.subscriptionStartDate,
        subscriptionPlan: user.subscriptionProfile.subscriptionPlan,
        nextPaymentDate: user.subscriptionProfile.nextPaymentDate,
        unitAmount: user.subscriptionProfile.unitAmount,
        discount: user.subscriptionProfile.discount,
      },
      customerInfo: {
        fullName: user.subscriptionProfile.stripeCustomer.fullName,
        email: user.subscriptionProfile.stripeCustomer.email,
        address: user.subscriptionProfile.stripeCustomer.address,
        phone: user.subscriptionProfile.stripeCustomer.phone,
      },
    };

    res.status(200).json(info);
  } catch (error) {
    next(error);
  }
};

const cancelSubscription = async (req, res, next) => {
  const { user } = req;
  try {
    await subscriptionService.cancelSubscription(user);

    res.status(200).send('Successfully cancelled subscription');
  } catch (error) {
    next(error);
  }
};

module.exports = { webhook, cancelSubscription, getCustomerInfo };
