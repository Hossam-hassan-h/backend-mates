const asyncHandler = require('express-async-handler');
const slugify = require('slugify');
const factory = require('./handlersFactory');
const Set = require('../models/setModel');
const Variant = require('../models/variantModel');
const ApiError = require('../utils/apiError');

// @desc    Get all sets
// @route   GET /api/v1/sets
// @access  Public
exports.getSets = factory.getAll(Set, 'Sets');

// @desc    Get specific set by id
// @route   GET /api/v1/sets/:id
// @access  Public
exports.getSet = factory.getOne(Set);

// @desc    Create set
// @route   POST /api/v1/sets
// @access  Private/Admin-Manager
exports.createSet = asyncHandler(async (req, res, next) => {
  const { name, description, relationType, items, bundlePrice, status, images } = req.body;

  if (!items || !Array.isArray(items) || items.length !== 2) {
    return next(new ApiError('A Set must bundle exactly two product variants', 400));
  }

  // Validate that both component variants exist
  const variants = await Variant.find({ _id: { $in: items } });
  if (variants.length !== 2) {
    return next(new ApiError('One or both component variants could not be found', 404));
  }

  const slug = slugify(name?.en || name?.ar || `set-${Date.now()}`, { lower: true });

  const newSet = await Set.create({
    name,
    slug,
    description,
    relationType: relationType || 'couple',
    items,
    bundlePrice: bundlePrice ? Math.round(Number(bundlePrice)) : undefined,
    status: status || 'published',
    images: images || [],
  });

  res.status(201).json({ data: newSet });
});

// @desc    Update set
// @route   PUT /api/v1/sets/:id
// @access  Private/Admin-Manager
exports.updateSet = asyncHandler(async (req, res, next) => {
  if (req.body.items) {
    if (!Array.isArray(req.body.items) || req.body.items.length !== 2) {
      return next(new ApiError('A Set must bundle exactly two product variants', 400));
    }
    const variants = await Variant.find({ _id: { $in: req.body.items } });
    if (variants.length !== 2) {
      return next(new ApiError('One or both component variants could not be found', 404));
    }
  }

  if (req.body.name?.en || req.body.name?.ar) {
    req.body.slug = slugify(req.body.name.en || req.body.name.ar, { lower: true });
  }

  if (req.body.bundlePrice !== undefined && req.body.bundlePrice !== null) {
    req.body.bundlePrice = Math.round(Number(req.body.bundlePrice));
  }

  const updatedSet = await Set.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!updatedSet) {
    return next(new ApiError(`No set found for id ${req.params.id}`, 404));
  }

  res.status(200).json({ data: updatedSet });
});

// @desc    Delete set
// @route   DELETE /api/v1/sets/:id
// @access  Private/Admin
exports.deleteSet = factory.deleteOne(Set);
