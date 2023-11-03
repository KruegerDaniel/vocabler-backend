const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  user: { type: mongoose.Types.ObjectId, required: true, ref: 'User' },
  address: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: Date, required: true, default: Date.now() },
  totalAmount: { type: Number, required: true },
  fullName: { type: String, required: true },
  currency: { type: String, required: true },
  discount: { type: Number, required: true },
  taxAmount: { type: Number, required: true },
});

const PaymentModel = mongoose.model('Payment', PaymentSchema);

module.exports = { Payment: PaymentModel };
