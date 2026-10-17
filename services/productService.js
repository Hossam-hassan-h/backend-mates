const asyncHandler = require('express-async-handler');
const slugify = require('slugify');
const sharp = require('sharp');
const { uploadMixOfImages } = require('../middlewares/uploadImageMiddleware');
const factory = require('./handlersFactory');
const Product = require('../models/productModel');
const Variant = require('../models/variantModel');
const ApiFeatures = require('../utils/apiFeatures');
const ApiError = require('../utils/apiError');
const { uploadBufferToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');

exports.uploadProductImages = uploadMixOfImages([
  { name: 'image', maxCount: 1 },
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 5 },
]);

exports.resizeProductImages = asyncHandler(async (req, res, next) => {
  if (!req.files) {
    return next();
  }

  req.body.images = req.body.images || [];

  // Cover image
  const coverFile = (req.files.imageCover && req.files.imageCover[0]) || (req.files.image && req.files.image[0]);
  if (coverFile) {
    let coverBuffer = coverFile.buffer;
    try {
      coverBuffer = await sharp(coverFile.buffer)
        .resize(1000, 1000, { fit: 'cover' })
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toBuffer();
    } catch (err) {
      coverBuffer = coverFile.buffer;
    }

    const uploadRes = await uploadBufferToCloudinary(coverBuffer, {
      folder: 'mates-store/products',
      resource_type: 'image',
    });

    req.body.images.push({
      url: uploadRes.secure_url,
      publicId: uploadRes.public_id,
      alt: { en: req.body.title || 'Product Cover', ar: req.body.title || 'صورة المنتج' },
      isCover: true,
    });
  }

  // Detail images
  if (req.files.images && req.files.images.length > 0) {
    await Promise.all(
      req.files.images.map(async (img) => {
        let imgBuffer = img.buffer;
        try {
          imgBuffer = await sharp(img.buffer)
            .resize(1000, 1000, { fit: 'cover' })
            .toFormat('jpeg')
            .jpeg({ quality: 90 })
            .toBuffer();
        } catch (err) {
          imgBuffer = img.buffer;
        }

        const uploadDetailRes = await uploadBufferToCloudinary(imgBuffer, {
          folder: 'mates-store/products',
          resource_type: 'image',
        });

        req.body.images.push({
          url: uploadDetailRes.secure_url,
          publicId: uploadDetailRes.public_id,
          alt: { en: req.body.title || '', ar: req.body.title || '' },
          isCover: false,
        });
      })
    );
  }

  next();
});

// Middleware to normalize product body for clothing schema
exports.normalizeProductData = (req, res, next) => {
  // Normalize bilingual name
  if (req.body.name && typeof req.body.name === 'string') {
    req.body.name = { en: req.body.name, ar: req.body.name };
  } else if (!req.body.name && req.body.title) {
    req.body.name = { en: req.body.title, ar: req.body.title };
  } else if (req.body.name && typeof req.body.name === 'object') {
    req.body.name = {
      en: req.body.name.en || req.body.name.ar || '',
      ar: req.body.name.ar || req.body.name.en || '',
    };
  }

  // Normalize bilingual description
  if (req.body.description && typeof req.body.description === 'string') {
    req.body.description = { en: req.body.description, ar: req.body.description };
  } else if (req.body.description && typeof req.body.description === 'object') {
    req.body.description = {
      en: req.body.description.en || req.body.description.ar || '',
      ar: req.body.description.ar || req.body.description.en || '',
    };
  }

  // Generate slug only if name or title is provided and slug is not explicitly passed
  if (!req.body.slug && (req.body.name || req.body.title)) {
    const titleForSlug = req.body.name?.en || req.body.name?.ar || `product-${Date.now()}`;
    req.body.slug = slugify(titleForSlug, { lower: true }) || `product-${Date.now()}`;
  }

  // Normalize category if passed as object
  if (req.body.category && typeof req.body.category === 'object') {
    req.body.category = req.body.category._id || req.body.category.id;
  }

  // Handle single image url string if passed
  if (req.body.imageCover && typeof req.body.imageCover === 'string' && (!req.body.images || req.body.images.length === 0)) {
    req.body.images = [
      {
        url: req.body.imageCover,
        publicId: req.body.imageCoverPublicId || '',
        alt: { en: '', ar: '' },
        isCover: true,
      },
    ];
  }

  next();
};

// @desc    Get list of products with variants populated
// @route   GET /api/v1/products
// @access  Public
exports.getProducts = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.category) {
    filter.category = req.query.category;
  }
  if (req.query.gender) {
    filter.gender = req.query.gender;
  }
  if (req.query.status) {
    if (req.query.status === 'active') {
      filter.status = { $in: ['active', 'published'] };
    } else if (req.query.status === 'hidden') {
      filter.status = { $in: ['hidden', 'draft'] };
    } else {
      filter.status = req.query.status;
    }
  }

  const documentsCounts = await Product.countDocuments(filter);
  const apiFeatures = new ApiFeatures(Product.find(filter), req.query)
    .paginate(documentsCounts)
    .filter()
    .search('Products')
    .limitFields()
    .sort();

  const { mongooseQuery, paginationResult } = apiFeatures;
  const products = await mongooseQuery.populate({
    path: 'variants',
    populate: [
      { path: 'size', select: 'code sortOrder' },
      { path: 'color', select: 'name slug hex' },
    ],
  });

  res.status(200).json({
    status: 'success',
    results: products.length,
    total: documentsCounts,
    totalDocuments: documentsCounts,
    paginationResult,
    data: products,
  });
});

// @desc    Get specific product by id with variants and reviews
// @route   GET /api/v1/products/:id
// @access  Public
exports.getProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id)
    .populate({
      path: 'variants',
      populate: [
        { path: 'size', select: 'code sortOrder' },
        { path: 'color', select: 'name slug hex' },
      ],
    })
    .populate('reviews');

  if (!product) {
    return next(new ApiError(`No product found for id ${req.params.id}`, 404));
  }

  res.status(200).json({ status: 'success', data: product });
});

// @desc    Create product
// @route   POST /api/v1/products
// @access  Private/Admin-Manager
exports.createProduct = asyncHandler(async (req, res, next) => {
  const document = await Product.create(req.body);

  // If price and/or quantity provided, ensure a base variant exists for seamless store purchase
  if (req.body.price !== undefined || req.body.quantity !== undefined || req.body.stock !== undefined) {
    try {
      const Size = require('../models/sizeModel');
      const Color = require('../models/colorModel');
      const defaultSize = (await Size.findOne({ code: 'M' })) || (await Size.findOne());
      const defaultColor = (await Color.findOne({ slug: 'black' })) || (await Color.findOne());

      if (defaultSize && defaultColor) {
        const priceVal = Number(req.body.price) || 0;
        const priceEGP = Math.round(priceVal * 100);
        const stockQuantity = Number(req.body.quantity !== undefined ? req.body.quantity : req.body.stock) || 0;
        const sku = `MTS-${document._id.toString().slice(-6)}-${defaultSize.code}`;

        await Variant.create({
          product: document._id,
          size: defaultSize._id,
          color: defaultColor._id,
          sku,
          priceEGP,
          stockQuantity,
          isActive: true,
        });
      }
    } catch (varErr) {
      console.warn('Notice: variant auto-creation skipped:', varErr.message);
    }
  }

  res.status(201).json({ data: document });
});

// @desc    Update product
// @route   PUT /api/v1/products/:id
// @access  Private/Admin-Manager
exports.updateProduct = asyncHandler(async (req, res, next) => {
  const document = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!document) {
    return next(new ApiError(`No product found for id ${req.params.id}`, 404));
  }

  // If price or stock is updated, sync variants
  if (req.body.price !== undefined || req.body.quantity !== undefined || req.body.stock !== undefined) {
    try {
      const updateData = {};
      if (req.body.price !== undefined) {
        updateData.priceEGP = Math.round(Number(req.body.price) * 100);
      }
      if (req.body.quantity !== undefined || req.body.stock !== undefined) {
        updateData.stockQuantity = Number(req.body.quantity !== undefined ? req.body.quantity : req.body.stock) || 0;
      }
      const existingVariants = await Variant.find({ product: req.params.id });
      if (existingVariants.length > 0) {
        await Variant.updateMany({ product: req.params.id }, { $set: updateData });
      }
    } catch (vErr) {
      console.warn('Notice: variant sync skipped:', vErr.message);
    }
  }

  res.status(200).json({ status: 'success', data: document });
});

// @desc    Delete product and associated variants
// @route   DELETE /api/v1/products/:id
// @access  Private/Admin
exports.deleteProduct = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const product = await Product.findByIdAndDelete(id);

  if (!product) {
    return next(new ApiError(`No product found for id ${id}`, 404));
  }

  // Delete associated variants
  await Variant.deleteMany({ product: id });

  // Delete associated Cloudinary images
  if (product.images && product.images.length > 0) {
    await Promise.all(
      product.images
        .filter((img) => img.publicId)
        .map((img) => deleteFromCloudinary(img.publicId))
    );
  }

  res.status(204).send();
});

// @desc    Bulk delete products
// @route   DELETE /api/v1/products/bulk
// @access  Private/Admin
exports.deleteBulkProducts = asyncHandler(async (req, res, next) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return next(new ApiError('Please provide an array of product IDs to delete', 400));
  }

  await Product.deleteMany({ _id: { $in: ids } });
  await Variant.deleteMany({ product: { $in: ids } });

  res.status(200).json({
    status: 'success',
    message: `${ids.length} products and their variants deleted successfully`,
  });
});

// @desc    Bulk update status
// @route   PUT /api/v1/products/bulk/status
// @access  Private/Admin-Manager
exports.updateBulkStatus = asyncHandler(async (req, res, next) => {
  const { ids, status } = req.body;
  if (!['draft', 'published', 'archived', 'active', 'hidden'].includes(status)) {
    return next(new ApiError('Invalid status value', 400));
  }

  let mappedStatus = status;
  if (status === 'active') {
    mappedStatus = 'published';
  } else if (status === 'hidden') {
    mappedStatus = 'draft';
  }

  await Product.updateMany({ _id: { $in: ids } }, { $set: { status: mappedStatus } });

  res.status(200).json({
    status: 'success',
    message: `${ids.length} products updated to status ${mappedStatus}`,
  });
});

// @desc    Discounted products (products with compareAtPrice on any variant)
// @route   GET /api/v1/products/discounted
// @access  Public
exports.getDiscountedProducts = asyncHandler(async (req, res) => {
  const discountedVariants = await Variant.find({
    compareAtPrice: { $exists: true, $ne: null },
    $expr: { $gt: ['$compareAtPrice', '$priceEGP'] },
  }).distinct('product');

  const products = await Product.find({ _id: { $in: discountedVariants }, status: 'published' })
    .populate({
      path: 'variants',
      populate: [
        { path: 'size', select: 'code sortOrder' },
        { path: 'color', select: 'name slug hex' },
      ],
    });

  res.status(200).json({
    status: 'success',
    results: products.length,
    data: products,
  });
});
