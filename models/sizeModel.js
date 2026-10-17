const mongoose = require('mongoose');

const sizeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Size code is required'],
      trim: true,
      unique: true,
      uppercase: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Size', sizeSchema);
