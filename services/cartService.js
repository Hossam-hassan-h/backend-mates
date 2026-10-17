const asyncHandler = require('express-async-handler');
const ApiError = require('../utils/apiError');
const Variant = require('../models/variantModel');
const SetModel = require('../models/setModel');
const Cart = require('../models/cartModel');

// Helper to recalculate cart totals
const recalcCartTotals = async (cart) => {
  let totalQuantity = 0;
  let totalCartPrice = 0;

  await Promise.all(
    cart.cartItems.map(async (item) => {
      const variant = await Variant.findById(item.variant);
      if (variant) {
        item.price = variant.priceEGP;
        item.totalPrice = item.quantity * variant.priceEGP;
        totalQuantity += item.quantity;
        totalCartPrice += item.totalPrice;
      }
    })
  );

  cart.totalQuantity = totalQuantity;
  cart.totalCartPrice = totalCartPrice;
};

// @desc    Add variant or set to cart
// @route   POST /api/v1/cart
// @access  Public (Guest with phone or session) / Private (User)
exports.addProductToCart = asyncHandler(async (req, res, next) => {
  const { variantId, setId, quantity = 1, phone } = req.body;
  const numQty = parseInt(quantity, 10);

  if (!numQty || numQty < 1 || !Number.isInteger(numQty)) {
    return next(new ApiError('Quantity must be a positive integer', 400));
  }

  // Handle Set addition
  if (setId) {
    const setDoc = await SetModel.findById(setId).populate('items');
    if (!setDoc || setDoc.items.length !== 2) {
      return next(new ApiError('Set not found or invalid', 404));
    }

    const [v1, v2] = setDoc.items;
    if (v1.stockQuantity < numQty || v2.stockQuantity < numQty) {
      return next(
        new ApiError(
          `Insufficient stock for set "${setDoc.name.ar || setDoc.name.en}". Item 1 stock: ${v1.stockQuantity}, Item 2 stock: ${v2.stockQuantity}`,
          400
        )
      );
    }

    // Locate cart
    const cartFilter = req.user ? { user: req.user._id } : { customerPhone: phone || 'guest' };
    let cart = await Cart.findOne(cartFilter);
    if (!cart) {
      cart = new Cart({ ...cartFilter, cartItems: [] });
    }

    // Add both variants associated with setId
    const addVariantToCart = (variant) => {
      const existingIdx = cart.cartItems.findIndex(
        (it) => it.variant?.toString() === variant._id.toString() && it.setId?.toString() === setId.toString()
      );
      if (existingIdx > -1) {
        cart.cartItems[existingIdx].quantity += numQty;
        cart.cartItems[existingIdx].totalPrice = cart.cartItems[existingIdx].quantity * variant.priceEGP;
      } else {
        cart.cartItems.push({
          variant: variant._id,
          setId,
          quantity: numQty,
          price: variant.priceEGP,
          totalPrice: numQty * variant.priceEGP,
        });
      }
    };

    addVariantToCart(v1);
    addVariantToCart(v2);

    await recalcCartTotals(cart);
    await cart.save();

    return res.status(200).json({
      status: 'success',
      message: 'Set components added to cart successfully',
      data: cart,
    });
  }

  // Handle single variant addition
  if (!variantId) {
    return next(new ApiError('variantId or setId is required', 400));
  }

  const variant = await Variant.findById(variantId);
  if (!variant || !variant.isActive) {
    return next(new ApiError('Clothing variant not found or inactive', 404));
  }

  const cartFilter = req.user ? { user: req.user._id } : { customerPhone: phone || 'guest' };
  let cart = await Cart.findOne(cartFilter);
  if (!cart) {
    cart = new Cart({ ...cartFilter, cartItems: [] });
  }

  const existingIdx = cart.cartItems.findIndex(
    (it) => it.variant?.toString() === variantId.toString() && !it.setId
  );

  const currentCartQty = existingIdx > -1 ? cart.cartItems[existingIdx].quantity : 0;
  if (currentCartQty + numQty > variant.stockQuantity) {
    return next(
      new ApiError(
        `Only ${variant.stockQuantity} items in stock for this variant. You already have ${currentCartQty} in cart.`,
        400
      )
    );
  }

  if (existingIdx > -1) {
    cart.cartItems[existingIdx].quantity += numQty;
    cart.cartItems[existingIdx].totalPrice = cart.cartItems[existingIdx].quantity * variant.priceEGP;
  } else {
    cart.cartItems.push({
      variant: variant._id,
      quantity: numQty,
      price: variant.priceEGP,
      totalPrice: numQty * variant.priceEGP,
    });
  }

  await recalcCartTotals(cart);
  await cart.save();

  res.status(200).json({
    status: 'success',
    message: 'Variant added to cart successfully',
    data: cart,
  });
});

// @desc    Get cart
// @route   GET /api/v1/cart
// @access  Public / Private
exports.getLoggedUserCart = asyncHandler(async (req, res, next) => {
  const { phone } = req.query;
  const cartFilter = req.user ? { user: req.user._id } : { customerPhone: phone || 'guest' };
  const cart = await Cart.findOne(cartFilter);

  if (!cart) {
    return res.status(200).json({
      status: 'success',
      numOfCartItems: 0,
      data: { cartItems: [], totalCartPrice: 0, totalQuantity: 0 },
    });
  }

  res.status(200).json({
    status: 'success',
    numOfCartItems: cart.cartItems.length,
    data: cart,
  });
});

// @desc    Remove specific cart item
// @route   DELETE /api/v1/cart/:itemId
// @access  Public / Private
exports.removeSpecificCartItem = asyncHandler(async (req, res, next) => {
  const phone = req.query.phone || req.body.phone;
  const cartFilter = req.user ? { user: req.user._id } : { customerPhone: phone || 'guest' };
  const cart = await Cart.findOne(cartFilter);

  if (!cart) {
    return next(new ApiError('Cart not found', 404));
  }

  cart.cartItems = cart.cartItems.filter(
    (item) => item._id.toString() !== req.params.itemId
  );

  await recalcCartTotals(cart);
  await cart.save();

  res.status(200).json({
    status: 'success',
    numOfCartItems: cart.cartItems.length,
    data: cart,
  });
});

// @desc    Clear cart
// @route   DELETE /api/v1/cart
// @access  Public / Private
exports.clearCart = asyncHandler(async (req, res, next) => {
  const phone = req.query.phone || req.body.phone;
  const cartFilter = req.user ? { user: req.user._id } : { customerPhone: phone || 'guest' };
  await Cart.findOneAndDelete(cartFilter);
  res.status(204).send();
});

// @desc    Update cart item quantity
// @route   PUT /api/v1/cart/:itemId
// @access  Public / Private
exports.updateCartItemQuantity = asyncHandler(async (req, res, next) => {
  const { quantity, phone } = req.body;
  const numQty = parseInt(quantity, 10);

  if (!numQty || numQty < 1 || !Number.isInteger(numQty)) {
    return next(new ApiError('Quantity must be an integer >= 1', 400));
  }

  const cartFilter = req.user ? { user: req.user._id } : { customerPhone: phone || 'guest' };
  const cart = await Cart.findOne(cartFilter);
  if (!cart) {
    return next(new ApiError('Cart not found', 404));
  }

  const itemIndex = cart.cartItems.findIndex(
    (item) => item._id.toString() === req.params.itemId
  );

  if (itemIndex === -1) {
    return next(new ApiError('Cart item not found', 404));
  }

  const cartItem = cart.cartItems[itemIndex];
  const variant = await Variant.findById(cartItem.variant);
  if (!variant) {
    return next(new ApiError('Variant no longer available', 404));
  }

  if (numQty > variant.stockQuantity) {
    return next(
      new ApiError(`Insufficient stock. Only ${variant.stockQuantity} available.`, 400)
    );
  }

  cartItem.quantity = numQty;
  cartItem.totalPrice = numQty * cartItem.price;

  await recalcCartTotals(cart);
  await cart.save();

  res.status(200).json({
    status: 'success',
    data: cart,
  });
});

// Compatibility empty coupon apply
exports.applyCoupon = asyncHandler(async (req, res) => {
  res.status(200).json({ status: 'success', message: 'Coupon received' });
});
