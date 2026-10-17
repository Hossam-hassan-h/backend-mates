const mongoose = require('mongoose');

const colorSchema = new mongoose.Schema(
  {
    name: {
      en: {
        type: String,
        required: [true, 'Color English name is required'],
        trim: true,
      },
      ar: {
        type: String,
        required: [true, 'Color Arabic name is required'],
        trim: true,
      },
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    hex: {
      type: String,
      required: [true, 'Color HEX code is required'],
      trim: true,
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid HEX color code'],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Color', colorSchema);
