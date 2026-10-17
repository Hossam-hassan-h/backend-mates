const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema(
  {
    cartItems: [
      {
        variant: {
          type: mongoose.Schema.ObjectId,
          ref: 'Variant',
          required: true,
        },
        setId: {
          type: mongoose.Schema.ObjectId,
          ref: 'Set',
        },
        quantity: {
          type: Number,
          default: 1,
          min: [1, 'Quantity must be at least 1'],
          validate: {
            validator: Number.isInteger,
            message: 'Quantity must be an integer',
          },
        },
        price: {
          type: Number,
          required: true,
          validate: {
            validator: Number.isInteger,
            message: 'Price must be an integer in piastres',
          },
        },
        totalPrice: {
          type: Number,
          required: true,
          validate: {
            validator: Number.isInteger,
            message: 'TotalPrice must be an integer in piastres',
          },
        },
      },
    ],
    totalQuantity: {
      type: Number,
      default: 0,
    },
    totalCartPrice: {
      type: Number,
      default: 0, // In piastres
    },
    customerPhone: {
      type: String,
      trim: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Populate variant details (product, size, color)
cartSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'cartItems.variant',
    populate: [
      { path: 'product', select: 'name slug images' },
      { path: 'size', select: 'code sortOrder' },
      { path: 'color', select: 'name slug hex' },
    ],
  });
  next();
});

module.exports = mongoose.model('Cart', cartSchema);
