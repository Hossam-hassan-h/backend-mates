const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      en: {
        type: String,
        required: [true, 'Category English name is required'],
        trim: true,
      },
      ar: {
        type: String,
        required: [true, 'Category Arabic name is required'],
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
    image: String,
    imagePublicId: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
