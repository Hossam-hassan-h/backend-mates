const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const asyncHandler = require('express-async-handler');
const path = require('path');
const fs = require('fs');

const factory = require('./handlersFactory');
const { uploadSingleImage } = require('../middlewares/uploadImageMiddleware');
const Banner = require('../models/bannerModel');
const { uploadBufferToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
const ApiError = require('../utils/apiError');

// Upload single image
exports.uploadBannerImage = uploadSingleImage('image');

// Image processing via Cloudinary with local fallback
exports.resizeBannerImage = asyncHandler(async (req, res, next) => {
  if (req.file) {
    let bufferToUpload = req.file.buffer;

    try {
      bufferToUpload = await sharp(req.file.buffer)
        .resize(1920, 800, {
          fit: 'cover',
          withoutEnlargement: true,
        })
        .toFormat('jpeg')
        .jpeg({ quality: 95 })
        .toBuffer();
    } catch (err) {
      bufferToUpload = req.file.buffer;
    }

    try {
      const result = await uploadBufferToCloudinary(bufferToUpload, {
        folder: 'mates-store/banners',
        resource_type: 'image',
      });

      req.body.image = result.secure_url;
      req.body.imagePublicId = result.public_id;
    } catch (cloudErr) {
      console.warn('Cloudinary banner upload fallback to local storage:', cloudErr.message || cloudErr);

      const bannersDir = path.join(__dirname, '..', 'uploads', 'banners');
      if (!fs.existsSync(bannersDir)) {
        fs.mkdirSync(bannersDir, { recursive: true });
      }

      const filename = `banner-${uuidv4()}-${Date.now()}.jpeg`;
      fs.writeFileSync(path.join(bannersDir, filename), bufferToUpload);

      const baseUrl = (process.env.BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');
      req.body.image = `${baseUrl}/banners/${filename}`;
      req.body.imagePublicId = filename;
    }
  }

  next();
});

// @desc    Get active hero banner
// @route   GET /api/v1/banners
// @access  Public
exports.getBanners = asyncHandler(async (req, res) => {
  const banner = await Banner.findOne().sort({ updatedAt: -1 });
  const banners = banner ? [banner] : [];
  res.status(200).json({
    status: 'success',
    results: banners.length,
    data: banners,
    heroBanner: banner,
  });
});

// @desc    Get specific banner by id
// @route   GET /api/v1/banners/:id
// @access  Public
exports.getBanner = factory.getOne(Banner);

// @desc    Create or replace single hero banner
// @route   POST /api/v1/banners
// @access  Private/Admin-Manager
exports.createBanner = asyncHandler(async (req, res, next) => {
  if (!req.body.image) {
    return next(new ApiError('Hero banner image is required', 400));
  }

  let banner = await Banner.findOne();

  if (banner) {
    const oldImage = banner.image;
    const oldPublicId = banner.imagePublicId;

    banner.image = req.body.image;
    banner.imagePublicId = req.body.imagePublicId || '';
    banner.isActive = req.body.isActive !== undefined ? req.body.isActive : true;
    await banner.save();

    // Clean up previous image safely after successful save
    if (oldImage && oldImage !== req.body.image) {
      try {
        await deleteFromCloudinary(oldPublicId || oldImage);
      } catch (delErr) {
        console.warn('[BANNER CLEANUP] Old image deletion notice:', delErr.message);
      }
    }

    return res.status(200).json({ status: 'success', data: banner });
  }

  banner = await Banner.create({
    image: req.body.image,
    imagePublicId: req.body.imagePublicId || '',
    isActive: req.body.isActive !== undefined ? req.body.isActive : true,
    order: 1,
  });

  res.status(201).json({ status: 'success', data: banner });
});

// @desc    Update hero banner
// @route   PUT /api/v1/banners/:id
// @access  Private/Admin-Manager
exports.updateBanner = asyncHandler(async (req, res, next) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) {
    return next(new ApiError(`No banner for this id ${req.params.id}`, 404));
  }

  const oldImage = banner.image;
  const oldPublicId = banner.imagePublicId;

  if (req.body.image) banner.image = req.body.image;
  if (req.body.imagePublicId !== undefined) banner.imagePublicId = req.body.imagePublicId;
  if (req.body.isActive !== undefined) banner.isActive = req.body.isActive;

  await banner.save();

  if (req.body.image && oldImage && oldImage !== req.body.image) {
    try {
      await deleteFromCloudinary(oldPublicId || oldImage);
    } catch (delErr) {
      console.warn('[BANNER CLEANUP] Old image deletion notice:', delErr.message);
    }
  }

  res.status(200).json({ status: 'success', data: banner });
});

// @desc    Delete hero banner and remove image
// @route   DELETE /api/v1/banners/:id
// @access  Private/Admin-Manager
exports.deleteBanner = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const banner = await Banner.findByIdAndDelete(id);

  if (!banner) {
    return next(new ApiError(`No banner for this id ${id}`, 404));
  }

  if (banner.image) {
    try {
      await deleteFromCloudinary(banner.imagePublicId || banner.image);
    } catch (delErr) {
      console.warn('[BANNER CLEANUP] Delete image notice:', delErr.message);
    }
  }

  res.status(204).send();
});
