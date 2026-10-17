const sharp = require('sharp');
const slugify = require('slugify');
const asyncHandler = require('express-async-handler');

const factory = require('./handlersFactory');
const { uploadSingleImage } = require('../middlewares/uploadImageMiddleware');
const Category = require('../models/categoryModel');
const { uploadBufferToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
const ApiError = require('../utils/apiError');

// Upload single image
exports.uploadCategoryImage = uploadSingleImage('image');

// Image processing via Cloudinary
exports.resizeImage = asyncHandler(async (req, res, next) => {
  if (req.file) {
    let bufferToUpload = req.file.buffer;

    try {
      bufferToUpload = await sharp(req.file.buffer)
        .resize(600, 600, { fit: 'cover' })
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toBuffer();
    } catch (err) {
      bufferToUpload = req.file.buffer;
    }

    const result = await uploadBufferToCloudinary(bufferToUpload, {
      folder: 'mates-store/categories',
      resource_type: 'image',
    });

    req.body.image = result.secure_url;
    req.body.imagePublicId = result.public_id;
  }

  next();
});

// Middleware to normalize category name to bilingual and generate slug
exports.normalizeCategoryData = (req, res, next) => {
  if (req.body.name && typeof req.body.name === 'string') {
    req.body.name = { en: req.body.name, ar: req.body.name };
  } else if (req.body.name && typeof req.body.name === 'object') {
    req.body.name = {
      en: req.body.name.en || req.body.name.ar || '',
      ar: req.body.name.ar || req.body.name.en || '',
    };
  }
  const slugSource = req.body.name?.en || req.body.name?.ar;
  if (!req.body.slug && slugSource) {
    req.body.slug = slugify(slugSource, { lower: true }) || `cat-${Date.now()}`;
  }
  next();
};

// @desc    Get list of categories
// @route   GET /api/v1/categories
// @access  Public
exports.getCategories = factory.getAll(Category);

// @desc    Get specific category by id
// @route   GET /api/v1/categories/:id
// @access  Public
exports.getCategory = factory.getOne(Category);

// @desc    Create category
// @route   POST  /api/v1/categories
// @access  Private/Admin-Manager
exports.createCategory = factory.createOne(Category);

// @desc    Update specific category
// @route   PUT /api/v1/categories/:id
// @access  Private/Admin-Manager
exports.updateCategory = asyncHandler(async (req, res, next) => {
  if (req.body.image) {
    const oldCategory = await Category.findById(req.params.id);
    if (oldCategory) {
      const oldImage = oldCategory.imagePublicId || oldCategory.image;
      if (oldImage) {
        await deleteFromCloudinary(oldImage);
      }
    }
  }

  const document = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  if (!document) {
    return next(new ApiError(`No category for this id ${req.params.id}`, 404));
  }

  res.status(200).json({ data: document });
});

// @desc    Delete specific category
// @route   DELETE /api/v1/categories/:id
// @access  Private/Admin
exports.deleteCategory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const category = await Category.findByIdAndDelete(id);

  if (!category) {
    return next(new ApiError(`No category for this id ${id}`, 404));
  }

  const imageToDelete = category.imagePublicId || category.image;
  if (imageToDelete) {
    await deleteFromCloudinary(imageToDelete);
  }

  res.status(204).send();
});
