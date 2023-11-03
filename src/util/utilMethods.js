/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
const logger = require('../logger');

/**
 * Remove id from all arrays in object.
 * A fast way of removing ids from objects with different id arrays
 * (e.g. studyProfile.flashcards, book.users, users.bookList)
 * @param {*} object: object with arrays of ids
 * @param {*} id: id to remove
 */
const removeIdFromObject = (object, id) => {
  try {
    for (const field in object) {
      const value = object[field];
      if (Array.isArray(value)) {
        const index = value.findIndex((x) => x.equals(id));
        if (index > -1) {
          value.splice(index, 1);
        }
      }
    }
  } catch (error) {
    logger.error(`Failed to remove id ${id} from object`);
  }
};

/**
 * Add an id to a target array in an object.
 * A fast way of adding ids to objects with different id arrays
 * (e.g. studyProfile.flashcards, book.users, users.bookList)
 * @param {*} object: object to add id to
 * @param {*} id: id to add
 * @param {*} targetField: destination field in object to add id to
 * @returns
 */
const addIdToObject = (object, id, targetField) => {
  if (!(targetField in object)) {
    logger.error(`Field name :${targetField} does not exist in passed studyObject`);
    return;
  }
  object[targetField].push(id);
};

/**
 * Remove id and add it to the target array in an object.
 * A fast way of reassigning ids in objects with different id arrays.
 * (e.g. studyProfile.flashcards, book.users, users.bookList)
 * @param {*} object: object which will have id reassigned
 * @param {ObjectId} id: id to reassign
 * @param {*} targetField: destination field in object to reassign id to
 */
const reassignIdInObject = (object, id, targetField) => {
  removeIdFromObject(object, id);
  addIdToObject(object, id, targetField);
};

module.exports = { addIdToObject, reassignIdInObject, removeIdFromObject };
