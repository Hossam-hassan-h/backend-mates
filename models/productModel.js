const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      en: {
        type: String,
        required: [true, 'Product English name is required'],
        trim: true,
        maxlength: [120, 'Too long product name'],
      },
      ar: {
        type: String,
        required: [true, 'Product Arabic name is required'],
        trim: true,
        maxlength: [120, 'Too long product name'],
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
      en: {
        type: String,
        trim: true,
      },
      ar: {
        type: String,
        trim: true,
      },
    },
    category: {
      type: mongoose.Schema.ObjectId,
      ref: 'Category',
      required: [true, 'Product must belong to a category'],
    },
    gender: {
      type: String,
      enum: ['men', 'women', 'unisex'],
      default: 'unisex',
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
    status: {
      type: String,
      enum: ['draft', 'published', 'archived', 'active', 'hidden'],
      default: 'published',
    },
    ratingsAverage: {
      type: Number,
      min: [1, 'Rating must be above or equal 1.0'],
      max: [5, 'Rating must be below or equal 5.0'],
      default: 4.5,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for variants
productSchema.virtual('variants', {
  ref: 'Variant',
  foreignField: 'product',
  localField: '_id',
});

// Virtual for reviews
productSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'product',
  localField: '_id',
});

// Compatibility virtuals for frontend transition
productSchema.virtual('title').get(function () {
  return this.name ? (this.name.ar || this.name.en) : '';
});

productSchema.virtual('imageCover').get(function () {
  if (this.images && this.images.length > 0) {
    const cover = this.images.find((img) => img.isCover);
    return cover ? cover.url : this.images[0].url;
  }
  return '';
});

productSchema.virtual('image').get(function () {
  return this.imageCover;
});

productSchema.virtual('price').get(function () {
  if (this.variants && this.variants.length > 0) {
    const activeVariants = this.variants.filter((v) => v.isActive !== false);
    if (activeVariants.length > 0) {
      const minPrice = Math.min(...activeVariants.map((v) => v.priceEGP || 0));
      return minPrice / 100;
    }
  }
  return 0;
});

productSchema.virtual('originalPrice').get(function () {
  if (this.variants && this.variants.length > 0) {
    const activeVariants = this.variants.filter((v) => v.isActive !== false);
    if (activeVariants.length > 0) {
      const compareVariant = activeVariants.find((v) => v.compareAtPrice && v.compareAtPrice > v.priceEGP);
      if (compareVariant) {
        return compareVariant.compareAtPrice / 100;
      }
    }
  }
  return 0;
});

productSchema.virtual('quantity').get(function () {
  if (this.variants && this.variants.length > 0) {
    return this.variants.reduce((sum, v) => sum + (v.stockQuantity || 0), 0);
  }
  return 0;
});

productSchema.virtual('stock').get(function () {
  return this.quantity;
});

// Populate category in find queries
productSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'category',
    select: 'name slug image',
  });
  next();
});

module.exports = mongoose.model('Product', productSchema);
