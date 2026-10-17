const asyncHandler = require('express-async-handler');
const sharp = require('sharp');
const bcrypt = require('bcryptjs');

const factory = require('./handlersFactory');
const ApiError = require('../utils/apiError');
const { uploadSingleImage } = require('../middlewares/uploadImageMiddleware');
const createToken = require('../utils/createToken');
const User = require('../models/userModel');
const Order = require('../models/orderModel');
const ApiFeatures = require('../utils/apiFeatures');
const { uploadBufferToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');

// Upload single image
exports.uploadUserImage = uploadSingleImage('profileImg');

// Image processing
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

    const uploadRes = await uploadBufferToCloudinary(bufferToUpload, {
      folder: 'fruit-store/users',
      resource_type: 'image',
    });

    req.body.profileImg = uploadRes.secure_url;
    req.body.profileImgPublicId = uploadRes.public_id;
  }

  next();
});

// @desc    Get list of users with search, filters, order metrics, and pagination
// @route   GET /api/v1/users or GET /api/v1/admin/customers
// @access  Private/Admin
exports.getUsers = asyncHandler(async (req, res) => {
  let filter = {};
  if (req.filterObj) {
    filter = { ...req.filterObj };
  }

  // Filter by account active status if provided and not 'all'
  if (req.query.active !== undefined && req.query.active !== '' && req.query.active !== 'all') {
    filter.active = req.query.active === 'true' || req.query.active === true;
  }

  // Filter by role if provided and not 'all'
  if (req.query.role && req.query.role !== 'all') {
    filter.role = req.query.role;
  }

  // Filter by presence of orders if provided
  if (req.query.hasOrders && req.query.hasOrders !== 'all') {
    const userIdsWithOrders = await Order.distinct('user');
    if (req.query.hasOrders === 'true' || req.query.hasOrders === true) {
      filter._id = { $in: userIdsWithOrders };
    } else if (req.query.hasOrders === 'false' || req.query.hasOrders === false) {
      filter._id = { $nin: userIdsWithOrders };
    }
  }

  // Build base query with filter and search
  const apiFeatures = new ApiFeatures(User.find(filter), req.query)
    .filter()
    .search('User');

  // Count documents matching filter and search for accurate pagination
  let matchingCounts;
  try {
    const countFeatures = new ApiFeatures(User.find(filter), req.query)
      .filter()
      .search('User');
    matchingCounts = await countFeatures.mongooseQuery.countDocuments();
  } catch (err) {
    matchingCounts = await User.countDocuments(filter);
  }

  apiFeatures.paginate(matchingCounts).limitFields().sort();

  // Execute query
  const { mongooseQuery, paginationResult } = apiFeatures;
  const users = await mongooseQuery;

  // Aggregate live order metrics for current page users
  const userIds = users.map((u) => u._id);
  const orderStats = await Order.aggregate([
    { $match: { user: { $in: userIds } } },
    {
      $group: {
        _id: '$user',
        ordersCount: { $sum: 1 },
        completedOrdersCount: {
          $sum: { $cond: [{ $eq: ['$orderStatus', 'completed'] }, 1, 0] },
        },
        totalSpent: {
          $sum: {
            $cond: [
              { $ne: ['$orderStatus', 'cancelled'] },
              { $ifNull: ['$finalTotal', '$totalOrderPrice'] },
              0,
            ],
          },
        },
        lastOrderDate: { $max: '$createdAt' },
      },
    },
  ]);

  const statsMap = new Map();
  orderStats.forEach((s) => {
    statsMap.set(s._id.toString(), s);
  });

  const enrichedUsers = users.map((u) => {
    const uObj = u.toObject ? u.toObject() : { ...u };
    const s = statsMap.get(u._id.toString()) || {};
    return {
      ...uObj,
      ordersCount: s.ordersCount || 0,
      completedOrdersCount: s.completedOrdersCount || 0,
      totalSpent: s.totalSpent || 0,
      lastOrderDate: s.lastOrderDate || null,
    };
  });

  res.status(200).json({
    results: enrichedUsers.length,
    total: matchingCounts,
    totalDocuments: matchingCounts,
    count: matchingCounts,
    paginationResult,
    data: enrichedUsers,
  });
});

// @desc    Get specific user by id
// @route   GET /api/v1/users/:id
// @access  Private/Admin
exports.getUser = factory.getOne(User);

// @desc    Create user
// @route   POST  /api/v1/users
// @access  Private/Admin
exports.createUser = factory.createOne(User);

// @desc    Update specific user
// @route   PUT /api/v1/users/:id
// @access  Private/Admin
exports.updateUser = asyncHandler(async (req, res, next) => {
  // If replacing profile image, clean up old one
  if (req.body.profileImg) {
    const oldUser = await User.findById(req.params.id);
    if (oldUser) {
      const oldImg = oldUser.profileImgPublicId || oldUser.profileImg;
      if (oldImg) {
        await deleteFromCloudinary(oldImg);
      }
    }
  }

  const updateFields = {
    name: req.body.name,
    slug: req.body.slug,
    phone: req.body.phone,
    email: req.body.email,
    profileImg: req.body.profileImg,
    role: req.body.role,
  };
  if (req.body.profileImgPublicId) {
    updateFields.profileImgPublicId = req.body.profileImgPublicId;
  }

  const document = await User.findByIdAndUpdate(
    req.params.id,
    updateFields,
    {
      new: true,
    }
  );

  if (!document) {
    return next(new ApiError(`No document for this id ${req.params.id}`, 404));
  }
  res.status(200).json({ data: document });
});

exports.changeUserPassword = asyncHandler(async (req, res, next) => {
  const document = await User.findByIdAndUpdate(
    req.params.id,
    {
      password: await bcrypt.hash(req.body.password, 12),
      passwordChangedAt: Date.now(),
    },
    {
      new: true,
    }
  );

  if (!document) {
    return next(new ApiError(`No document for this id ${req.params.id}`, 404));
  }
  res.status(200).json({ data: document });
});

// @desc    Delete specific user (anonymize orders, preserve accounting/reports)
// @route   DELETE /api/v1/users/:id or /api/v1/admin/customers/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = await User.findById(id);

  if (!user) {
    return next(new ApiError(`No document for this id ${id}`, 404));
  }

  // 1) Anonymize all orders belonging to this customer for privacy and accounting compliance
  await Order.updateMany(
    { user: id },
    {
      $set: {
        customerName: 'عميل محذوف',
        phone: '—',
        address: '—',
        'shippingAddress.details': '—',
        'shippingAddress.phone': '—',
      },
    }
  );

  // 2) Delete profile image from Cloudinary if present
  const oldImg = user.profileImgPublicId || user.profileImg;
  if (oldImg) {
    await deleteFromCloudinary(oldImg);
  }

  // 3) Permanently remove user record
  await User.findByIdAndDelete(id);

  res.status(200).json({
    status: 'success',
    message: 'تم حذف العميل بنجاح وتمت معالجة سجل الطلبات',
    data: { id },
  });
});

// @desc    Get Logged user data
// @route   GET /api/v1/users/getMe
// @access  Private/Protect
exports.getLoggedUserData = asyncHandler(async (req, res, next) => {
  req.params.id = req.user._id;
  next();
});

// @desc    Update logged user password
// @route   PUT /api/v1/users/updateMyPassword
// @access  Private/Protect
exports.updateLoggedUserPassword = asyncHandler(async (req, res, next) => {
  // 1) Update user password based user payload (req.user._id)
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      password: await bcrypt.hash(req.body.password, 12),
      passwordChangedAt: Date.now(),
    },
    {
      new: true,
    }
  );

  // 2) Generate token
  const token = createToken(user._id);

  res.status(200).json({ data: user, token });
});

// @desc    Update logged user data (without password, role)
// @route   PUT /api/v1/users/updateMe
// @access  Private/Protect
exports.updateLoggedUserData = asyncHandler(async (req, res, next) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
    },
    { new: true }
  );

  res.status(200).json({ data: updatedUser });
});

// @desc    Deactivate logged user
// @route   DELETE /api/v1/users/deleteMe
// @access  Private/Protect
exports.deleteLoggedUserData = asyncHandler(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user._id, { active: false });

  res.status(204).json({ status: 'Success' });
});
