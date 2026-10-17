const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.ObjectId,
      ref: 'Product',
      required: [true, 'Variant must belong to a product'],
      index: true,
    },
    size: {
      type: mongoose.Schema.ObjectId,
      ref: 'Size',
      required: [true, 'Variant must have a size'],
    },
    color: {
      type: mongoose.Schema.ObjectId,
      ref: 'Color',
      required: [true, 'Variant must have a color'],
    },
    sku: {
      type: String,
      required: [true, 'Variant SKU is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    priceEGP: {
      type: Number,
      required: [true, 'Variant price is required'],
      min: [0, 'Price cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'priceEGP must be an integer in piastres',
      },
    },
    compareAtPrice: {
      type: Number,
      min: [0, 'Compare-at price cannot be negative'],
      validate: {
        validator: (val) => val === undefined || val === null || Number.isInteger(val),
        message: 'compareAtPrice must be an integer in piastres',
      },
    },
    stockQuantity: {
      type: Number,
      required: [true, 'Variant stock quantity is required'],
      min: [0, 'Stock quantity cannot be negative'],
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'stockQuantity must be an integer',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound unique index ensuring only one variant exists per (product, size, color)
variantSchema.index({ product: 1, size: 1, color: 1 }, { unique: true });

// Auto populate size and color on find queries
variantSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'size',
    select: 'code sortOrder',
  }).populate({
    path: 'color',
    select: 'name slug hex',
  });
  next();
});

module.exports = mongoose.model('Variant', variantSchema);
