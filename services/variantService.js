const asyncHandler = require('express-async-handler');
const factory = require('./handlersFactory');
const Variant = require('../models/variantModel');
const Product = require('../models/productModel');
const ApiError = require('../utils/apiError');

// Middleware to filter variants for a specific product when nested route is called
exports.createFilterObj = (req, res, next) => {
  let filterObject = {};
  if (req.params.productId) filterObject = { product: req.params.productId };
  req.filterObj = filterObject;
  next();
};

// Middleware to set productId to body when nested route is called
exports.setProductIdToBody = (req, res, next) => {
  if (!req.body.product && req.params.productId) req.body.product = req.params.productId;
  next();
};

// @desc    Get list of variants
// @route   GET /api/v1/variants or /api/v1/products/:productId/variants
// @access  Public
exports.getVariants = factory.getAll(Variant, 'Variants');

// @desc    Get specific variant by id
// @route   GET /api/v1/variants/:id
// @access  Public
exports.getVariant = factory.getOne(Variant);

// @desc    Create variant
// @route   POST /api/v1/variants or /api/v1/products/:productId/variants
// @access  Private/Admin-Manager
exports.createVariant = asyncHandler(async (req, res, next) => {
  const { product, size, color, sku, priceEGP, compareAtPrice, stockQuantity, isActive } = req.body;

  // Verify product exists
  const prodExists = await Product.findById(product);
  if (!prodExists) {
    return next(new ApiError(`Product not found with id ${product}`, 404));
  }

  // Ensure unique variant for product + size + color
  const existingVariant = await Variant.findOne({ product, size, color });
  if (existingVariant) {
    return next(
      new ApiError('A variant with this size and color combination already exists for this product', 400)
    );
  }

  // If sku not provided, generate a readable SKU
  const finalSku = sku || `MTS-${product.toString().slice(-4).toUpperCase()}-${Date.now().toString().slice(-4)}`;

  const newVariant = await Variant.create({
    product,
    size,
    color,
    sku: finalSku,
    priceEGP: Math.round(Number(priceEGP)),
    compareAtPrice: compareAtPrice ? Math.round(Number(compareAtPrice)) : undefined,
    stockQuantity: Math.max(0, parseInt(stockQuantity, 10) || 0),
    isActive: isActive !== undefined ? Boolean(isActive) : true,
  });

  res.status(201).json({ data: newVariant });
});

// @desc    Update specific variant
// @route   PUT /api/v1/variants/:id
// @access  Private/Admin-Manager
exports.updateVariant = asyncHandler(async (req, res, next) => {
  const updates = { ...req.body };
  if (updates.priceEGP !== undefined) updates.priceEGP = Math.round(Number(updates.priceEGP));
  if (updates.compareAtPrice !== undefined) {
    updates.compareAtPrice = updates.compareAtPrice ? Math.round(Number(updates.compareAtPrice)) : undefined;
  }
  if (updates.stockQuantity !== undefined) {
    updates.stockQuantity = Math.max(0, parseInt(updates.stockQuantity, 10));
  }

  const updatedVariant = await Variant.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  if (!updatedVariant) {
    return next(new ApiError(`No variant found for id ${req.params.id}`, 404));
  }

  res.status(200).json({ data: updatedVariant });
});

// @desc    Delete specific variant
// @route   DELETE /api/v1/variants/:id
// @access  Private/Admin
exports.deleteVariant = factory.deleteOne(Variant);
