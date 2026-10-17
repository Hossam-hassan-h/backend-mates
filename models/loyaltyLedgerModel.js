const mongoose = require('mongoose');

const loyaltyLedgerSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.ObjectId,
      ref: 'Customer',
      required: [true, 'Loyalty entry must belong to a customer'],
      index: true,
    },
    order: {
      type: mongoose.Schema.ObjectId,
      ref: 'Order',
    },
    type: {
      type: String,
      enum: ['earn', 'redeem', 'adjust'],
      required: [true, 'Entry type is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount in piastres is required'],
      validate: {
        validator: Number.isInteger,
        message: 'amount must be an integer in piastres',
      },
    },
    balanceAfter: {
      type: Number,
      required: [true, 'Balance after transaction is required'],
      min: [0, 'Balance after transaction cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'balanceAfter must be an integer in piastres',
      },
    },
    reason: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

loyaltyLedgerSchema.index({ customer: 1, createdAt: -1 });

module.exports = mongoose.model('LoyaltyLedger', loyaltyLedgerSchema);
