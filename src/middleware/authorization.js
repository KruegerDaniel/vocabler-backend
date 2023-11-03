const logger = require('../logger');
const { userRoleEnum, defaultStudyConfig } = require('../util/enum');
const { StudyProfile } = require('../models/studyProfile');
const { User } = require('../models/user');

async function verifyTrial(user, userRole) {
  if (userRole === userRoleEnum.TRIAL) {
    const trialEnd = user.trialDueDate;
    const now = new Date();
    if (now > trialEnd) {
      // set user to free and reset studyConfig to basic plan
      await User.findByIdAndUpdate(user._id, { userRole: userRoleEnum.FREE });
      await StudyProfile.findOneAndUpdate({ user: user._id }, { $set: { studyConfig: defaultStudyConfig } });
      logger.info(`User ${user._id} trial has ended`);
    }
  }
}

async function authorizeStudySession(req, res, next) {
  try {
    const { user } = req;
    const { userRole } = user;

    await verifyTrial(user, userRole);

    if (userRole === userRoleEnum.FREE) {
      const studyProfile = await StudyProfile.findOne({ user: user._id });
      const { studyStart } = studyProfile.freemiumLimit;
      const { studyEnd } = studyProfile.freemiumLimit;

      // midnight of current day
      const currentDay = new Date();
      currentDay.setHours(0, 0, 0, 0);
      if (currentDay > studyEnd) {
        // if has not been started today, then reset
        if (currentDay > studyStart) {
          await StudyProfile.findByIdAndUpdate(studyProfile._id, { 'freemiumLimit.studyStart': currentDay });
        }
        next();
        return;
      }
      // user has already completed studySession today
      logger.info(`User ${user._id} has reached study limit`);
      res.status(403).json({ message: 'User has reached study limit' });
      return;
    }
  } catch (error) {
    next(error);
    return;
  }

  next();
}

async function concludeStudySession(req, res, next) {
  try {
    const { user } = req;
    const { userRole } = user;

    if (userRole === userRoleEnum.FREE) {
      const studyProfile = await StudyProfile.findOne({ user: user._id });
      const { studyStart } = studyProfile.freemiumLimit;

      // midnight of current day
      const currentDay = new Date();
      currentDay.setHours(0, 0, 0, 0);
      // studySession has been started today and is complete
      if (studyStart >= currentDay && !studyProfile.studySession) {
        await StudyProfile.findByIdAndUpdate(studyProfile._id, { 'freemiumLimit.studyEnd': currentDay });
      }
    }

    next();
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: error.message });
  }
}

async function authorizeStudyConfig(req, res, next) {
  try {
    const { user } = req;
    const { userRole } = user;

    verifyTrial(user, userRole);

    if (userRole === userRoleEnum.FREE) {
      logger.info(`User ${user._id} may not edit studyConfig`);
      res.status(403).json({ error: 'Forbidden', message: 'Free user may not edit studyConfig' });
    } else {
      next();
    }
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = { authorizeStudySession, authorizeStudyConfig, concludeStudySession };
