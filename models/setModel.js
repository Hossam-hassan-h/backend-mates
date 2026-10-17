const mongoose = require('mongoose');

const setSchema = new mongoose.Schema(
  {
    name: {
      en: {
        type: String,
        required: [true, 'Set English name is required'],
        trim: true,
      },
      ar: {
        type: String,
        required: [true, 'Set Arabic name is required'],
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
    description: {
      en: { type: String, trim: true },
      ar: { type: String, trim: true },
    },
    relationType: {
      type: String,
      enum: ['couple', 'friends', 'siblings', 'other'],
      default: 'couple',
    },
    items: {
      type: [
        {
          type: mongoose.Schema.ObjectId,
          ref: 'Variant',
          required: true,
        },
      ],
      validate: {
        validator: (val) => Array.isArray(val) && val.length === 2,
        message: 'A Set must contain exactly two component variants',
      },
    },
    bundlePrice: {
      type: Number,
      validate: {
        validator: (val) => val === undefined || val === null || (Number.isInteger(val) && val >= 0),
        message: 'bundlePrice must be a non-negative integer in piastres',
      },
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'published',
    },
    images: [
      {
        url: { type: String, required: true },
        publicId: String,
        alt: {
          en: { type: String, default: '' },
          ar: { type: String, default: '' },
        },
        isCover: { type: Boolean, default: false },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Populate component variants
setSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'items',
    populate: [
      { path: 'product', select: 'name slug images' },
      { path: 'size', select: 'code sortOrder' },
      { path: 'color', select: 'name slug hex' },
    ],
  });
  next();
});

// Dynamic virtual price: returns bundlePrice or sum of two variants
setSchema.virtual('effectivePriceEGP').get(function () {
  if (this.bundlePrice !== undefined && this.bundlePrice !== null) {
    return this.bundlePrice;
  }
  if (this.items && this.items.length === 2 && this.items[0]?.priceEGP !== undefined && this.items[1]?.priceEGP !== undefined) {
    return this.items[0].priceEGP + this.items[1].priceEGP;
  }
  return 0;
});

// Dynamic virtual available stock: min stock of the two variants
setSchema.virtual('stockQuantity').get(function () {
  if (this.items && this.items.length === 2 && this.items[0]?.stockQuantity !== undefined && this.items[1]?.stockQuantity !== undefined) {
    return Math.min(this.items[0].stockQuantity, this.items[1].stockQuantity);
  }
  return 0;
});

module.exports = mongoose.model('Set', setSchema);
