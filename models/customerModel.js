const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: [true, 'Customer phone number is required'],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    loyaltyBalance: {
      type: Number,
      default: 0,
      min: [0, 'Loyalty balance cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'loyaltyBalance must be an integer in piastres',
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Customer', customerSchema);
