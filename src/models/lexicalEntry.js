const mongoose = require('mongoose');
const logger = require('../logger');

const entryDefinitionSchema = new mongoose.Schema({
  definitions: { type: [String] },
  examples: { type: [String] },
  freqRank: { type: Number },
});

const lexicalEntrySchema = new mongoose.Schema({
  lemma: { type: String, required: true },
  a: { type: entryDefinitionSchema }, // adjective
  v: { type: entryDefinitionSchema }, // verb
  n: { type: entryDefinitionSchema }, // noun
  r: { type: entryDefinitionSchema }, // adverb
  s: { type: entryDefinitionSchema }, // adjective-satellite
});

lexicalEntrySchema.pre('save', () => {
  logger.error('Attempted to create a new Lexical Entry');
  throw new Error('Unable to save. Lexical Entry is immutable');
});

lexicalEntrySchema.pre('update', () => {
  logger.error('Attempted to update a new Lexical Entry');
  throw new Error('Unable to update. Lexical Entry is immutable');
});

const LexicalEntryModel = mongoose.model('LexicalEntry', lexicalEntrySchema);

module.exports = { LexicalEntry: LexicalEntryModel };
