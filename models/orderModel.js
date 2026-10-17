const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
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
    productName: {
      en: { type: String, default: '' },
      ar: { type: String, default: '' },
    },
    sizeSnapshot: {
      type: String,
      default: '',
    },
    colorSnapshot: {
      name: {
        en: { type: String, default: '' },
        ar: { type: String, default: '' },
      },
      hex: { type: String, default: '' },
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'unitPrice must be an integer in piastres',
      },
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'quantity must be an integer',
      },
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'totalPrice must be an integer in piastres',
      },
    },
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    customer: {
      customerId: {
        type: mongoose.Schema.ObjectId,
        ref: 'Customer',
      },
      name: {
        type: String,
        required: [true, 'Customer name is required'],
        trim: true,
      },
      phone: {
        type: String,
        required: [true, 'Customer phone number is required'],
        trim: true,
      },
      address: {
        type: String,
        required: [true, 'Delivery address is required'],
        trim: true,
      },
    },
    items: [orderItemSchema],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'subtotal must be an integer in piastres',
      },
    },
    pointsRedeemed: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'pointsRedeemed must be an integer in piastres',
      },
    },
    total: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'total must be an integer in piastres',
      },
    },
    pointsEarned: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'pointsEarned must be an integer in piastres',
      },
    },
    loyaltyRewardApplied: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['pending', 'preparing', 'out_for_delivery', 'completed', 'cancelled'],
      default: 'pending',
    },
    paymentMethodType: {
      type: String,
      enum: ['cash'],
      default: 'cash',
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Backward compatibility virtuals for existing admin dashboard and orders views
orderSchema.virtual('customerName').get(function () {
  return this.customer ? this.customer.name : '';
});

orderSchema.virtual('phone').get(function () {
  return this.customer ? this.customer.phone : '';
});

orderSchema.virtual('address').get(function () {
  return this.customer ? this.customer.address : '';
});

orderSchema.virtual('orderStatus').get(function () {
  return this.status;
});

orderSchema.virtual('finalTotal').get(function () {
  return this.total !== undefined ? this.total / 100 : 0;
});

orderSchema.virtual('totalOrderPrice').get(function () {
  return this.total !== undefined ? this.total / 100 : 0;
});

orderSchema.virtual('cartItems').get(function () {
  if (!this.items) return [];
  return this.items.map((it) => ({
    product: {
      name: it.productName.ar || it.productName.en,
      title: it.productName.ar || it.productName.en,
    },
    quantity: it.quantity,
    color: it.colorSnapshot?.name?.ar || it.colorSnapshot?.name?.en,
    size: it.sizeSnapshot,
    price: it.unitPrice / 100,
    totalPrice: it.totalPrice / 100,
  }));
});

// Auto-populate variant details when querying orders
orderSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'items.variant',
    select: 'sku priceEGP stockQuantity size color',
  });
  next();
});

module.exports = mongoose.model('Order', orderSchema);
