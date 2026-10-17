const asyncHandler = require('express-async-handler');
const ApiError = require('../utils/apiError');
const ApiFeatures = require('../utils/apiFeatures');
const Order = require('../models/orderModel');
const Customer = require('../models/customerModel');
const Variant = require('../models/variantModel');
const LoyaltyLedger = require('../models/loyaltyLedgerModel');
const StoreSettings = require('../models/storeSettingsModel');
const Cart = require('../models/cartModel');
const { buildWhatsAppMessage } = require('./orderServiceHelper');

// @desc    Create cash order with variant stock check and 5% loyalty
// @route   POST /api/v1/orders
// @access  Public (Guest checkout supported with minimal customer identity)
exports.createOrder = asyncHandler(async (req, res, next) => {
  const {
    customerName,
    phone,
    address,
    items,
    redeemPoints = 0,
  } = req.body;

  if (!customerName || !phone || !address) {
    return next(new ApiError('Customer name, phone, and address are required for checkout', 400));
  }

  const cleanPhone = String(phone).trim();
  const cleanName = String(customerName).trim();
  const cleanAddress = String(address).trim();
  const pointsToRedeem = Math.max(0, parseInt(redeemPoints, 10) || 0);

  // 1. Get or create Customer identity
  let customer = await Customer.findOne({ phone: cleanPhone });
  if (!customer) {
    customer = await Customer.create({
      phone: cleanPhone,
      name: cleanName,
      address: cleanAddress,
      loyaltyBalance: 0,
    });
  } else {
    customer.name = cleanName;
    customer.address = cleanAddress;
    await customer.save();
  }

  // 2. Validate redemption request
  if (pointsToRedeem > customer.loyaltyBalance) {
    return next(
      new ApiError(
        `Cannot redeem ${pointsToRedeem} piastres. Available balance: ${customer.loyaltyBalance} piastres (${(customer.loyaltyBalance / 100).toFixed(2)} EGP)`,
        400
      )
    );
  }

  // 3. Determine order items from body or cart
  let orderItemsData = items;
  if (!orderItemsData || orderItemsData.length === 0) {
    const cartFilter = req.user ? { user: req.user._id } : { customerPhone: cleanPhone };
    const cart = await Cart.findOne(cartFilter);
    if (!cart || cart.cartItems.length === 0) {
      return next(new ApiError('Your cart is empty', 400));
    }
    orderItemsData = cart.cartItems.map((it) => ({
      variant: it.variant?._id || it.variant,
      setId: it.setId,
      quantity: it.quantity,
    }));
  }

  // 4. Validate variants and stock availability
  const variantIds = orderItemsData.map((it) => it.variant);
  const variants = await Variant.find({ _id: { $in: variantIds } })
    .populate('product', 'name slug')
    .populate('size', 'code')
    .populate('color', 'name hex');

  const variantMap = new Map();
  variants.forEach((v) => variantMap.set(v._id.toString(), v));

  let subtotal = 0;
  const snapshotItems = [];
  const stockBulkOperations = [];

  for (let i = 0; i < orderItemsData.length; i += 1) {
    const it = orderItemsData[i];
    const vIdStr = it.variant.toString();
    const variant = variantMap.get(vIdStr);
    if (!variant || !variant.isActive) {
      return next(new ApiError(`Clothing variant ${it.variant} is unavailable or inactive`, 400));
    }

    const qty = parseInt(it.quantity, 10);
    if (qty < 1) {
      return next(new ApiError('Item quantity must be at least 1', 400));
    }

    if (variant.stockQuantity < qty) {
      const pName = variant.product?.name?.ar || variant.product?.name?.en || 'المنتج';
      return next(
        new ApiError(
          `Insufficient stock for "${pName}" (Size: ${variant.size?.code}). Available: ${variant.stockQuantity}, requested: ${qty}`,
          400
        )
      );
    }

    const unitPrice = variant.priceEGP;
    const itemTotal = unitPrice * qty;
    subtotal += itemTotal;

    snapshotItems.push({
      variant: variant._id,
      setId: it.setId || undefined,
      productName: {
        en: variant.product?.name?.en || '',
        ar: variant.product?.name?.ar || '',
      },
      sizeSnapshot: variant.size?.code || '',
      colorSnapshot: {
        name: {
          en: variant.color?.name?.en || '',
          ar: variant.color?.name?.ar || '',
        },
        hex: variant.color?.hex || '',
      },
      unitPrice,
      quantity: qty,
      totalPrice: itemTotal,
    });

    stockBulkOperations.push({
      updateOne: {
        filter: { _id: variant._id },
        update: { $inc: { stockQuantity: -qty } },
      },
    });
  }

  // 5. Read StoreSettings for loyalty rate and WhatsApp number
  let settings = await StoreSettings.findOne({ key: 'main' });
  if (!settings) {
    settings = await StoreSettings.create({});
  }

  const loyaltyBps = settings.loyaltyRateBasisPoints || 500; // 5% = 500 bps
  const whatsappNumber = settings.whatsappNumber || '201000000000';

  if (pointsToRedeem > subtotal) {
    return next(
      new ApiError(
        `Redeemed points (${pointsToRedeem} piastres) cannot exceed order subtotal (${subtotal} piastres)`,
        400
      )
    );
  }

  const total = subtotal - pointsToRedeem;
  // Loyalty points earned strictly on the order subtotal before redemption
  const pointsEarned = Math.floor((subtotal * loyaltyBps) / 10000);

  // 6. Generate unique order number
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seq = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `MTS-${todayStr}-${seq}`;

  // 7. Create Order document
  const order = await Order.create({
    orderNumber,
    customer: {
      customerId: customer._id,
      name: cleanName,
      phone: cleanPhone,
      address: cleanAddress,
    },
    items: snapshotItems,
    subtotal,
    pointsRedeemed: pointsToRedeem,
    total,
    pointsEarned,
    status: 'pending',
    paymentMethodType: 'cash',
  });

  // 8. Decrement stock from variants
  if (stockBulkOperations.length > 0) {
    await Variant.bulkWrite(stockBulkOperations);
  }

  // 9. Update Customer loyalty balance and write LoyaltyLedger entries
  let currentBalance = customer.loyaltyBalance;

  // Handle redemption ledger entry
  if (pointsToRedeem > 0) {
    currentBalance -= pointsToRedeem;
    await LoyaltyLedger.create({
      customer: customer._id,
      order: order._id,
      type: 'redeem',
      amount: -pointsToRedeem,
      balanceAfter: currentBalance,
      reason: `Points redeemed on order ${order.orderNumber}`,
    });
  }

  // Handle earn ledger entry
  if (pointsEarned > 0) {
    currentBalance += pointsEarned;
    await LoyaltyLedger.create({
      customer: customer._id,
      order: order._id,
      type: 'earn',
      amount: pointsEarned,
      balanceAfter: currentBalance,
      reason: `Earned 5% loyalty points on order ${order.orderNumber}`,
    });
  }

  customer.loyaltyBalance = currentBalance;
  await customer.save();

  // 10. Clear customer's cart
  const cartFilter = req.user ? { user: req.user._id } : { customerPhone: cleanPhone };
  await Cart.findOneAndDelete(cartFilter);

  // 11. Build WhatsApp URL
  const whatsappUrl = buildWhatsAppMessage(order, whatsappNumber);

  res.status(201).json({
    status: 'success',
    data: order,
    customerLoyaltyBalance: customer.loyaltyBalance,
    whatsappUrl,
  });
});

// @desc    Get all orders with search, date range, and status counts
// @route   GET /api/v1/orders
// @access  Private/Admin-Manager
exports.findAllOrders = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) {
    filter.status = req.query.status;
  }
  if (req.query.search) {
    const s = req.query.search;
    filter.$or = [
      { orderNumber: { $regex: s, $options: 'i' } },
      { 'customer.name': { $regex: s, $options: 'i' } },
      { 'customer.phone': { $regex: s, $options: 'i' } },
    ];
  }

  const totalDocuments = await Order.countDocuments(filter);
  const apiFeatures = new ApiFeatures(Order.find(filter), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate(totalDocuments);

  const orders = await apiFeatures.mongooseQuery;

  // Compute status counts for admin dashboard
  const statusCounts = await Order.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const countsMap = {
    all: totalDocuments,
    pending: 0,
    preparing: 0,
    out_for_delivery: 0,
    completed: 0,
    cancelled: 0,
  };
  statusCounts.forEach((s) => {
    if (s._id) countsMap[s._id] = s.count;
  });

  res.status(200).json({
    status: 'success',
    results: orders.length,
    totalDocuments,
    statusCounts: countsMap,
    paginationResult: apiFeatures.paginationResult,
    data: orders,
  });
});

// @desc    Get specific order by id
// @route   GET /api/v1/orders/:id
// @access  Public (for customer confirmation) / Private (Admin)
exports.findSpecificOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return next(new ApiError(`No order found with id ${req.params.id}`, 404));
  }
  res.status(200).json({ status: 'success', data: order });
});

// @desc    Update order status
// @route   PUT /api/v1/orders/:id/status
// @access  Private/Admin-Manager
exports.updateOrderStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  const allowed = ['pending', 'preparing', 'out_for_delivery', 'completed', 'cancelled'];
  if (!allowed.includes(status)) {
    return next(new ApiError(`Invalid status. Must be one of: ${allowed.join(', ')}`, 400));
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    return next(new ApiError(`No order found with id ${req.params.id}`, 404));
  }

  const previousStatus = order.status;
  order.status = status;
  await order.save();

  // If order is cancelled, reverse stock and loyalty points if needed
  if (status === 'cancelled' && previousStatus !== 'cancelled') {
    // Restock variants
    const restockOps = order.items.map((it) => ({
      updateOne: {
        filter: { _id: it.variant },
        update: { $inc: { stockQuantity: it.quantity } },
      },
    }));
    if (restockOps.length > 0) {
      await Variant.bulkWrite(restockOps);
    }

    // Reverse loyalty points from customer
    if (order.customer.customerId && order.pointsEarned > 0) {
      const customer = await Customer.findById(order.customer.customerId);
      if (customer) {
        const reversedPts = Math.min(customer.loyaltyBalance, order.pointsEarned);
        customer.loyaltyBalance = Math.max(0, customer.loyaltyBalance - reversedPts);
        await customer.save();

        await LoyaltyLedger.create({
          customer: customer._id,
          order: order._id,
          type: 'adjust',
          amount: -reversedPts,
          balanceAfter: customer.loyaltyBalance,
          reason: `Reversed earned points for cancelled order ${order.orderNumber}`,
        });
      }
    }
  }

  res.status(200).json({ status: 'success', data: order });
});
