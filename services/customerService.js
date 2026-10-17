const asyncHandler = require('express-async-handler');
const factory = require('./handlersFactory');
const Customer = require('../models/customerModel');
const LoyaltyLedger = require('../models/loyaltyLedgerModel');
const ApiError = require('../utils/apiError');

// @desc    Lookup customer by phone number (public for checkout loyalty identification)
// @route   GET /api/v1/customers/lookup
// @access  Public
exports.lookupCustomerByPhone = asyncHandler(async (req, res, next) => {
  const { phone } = req.query;
  if (!phone) {
    return next(new ApiError('Phone query parameter is required for lookup', 400));
  }

  const cleanPhone = String(phone).trim();
  const customer = await Customer.findOne({ phone: cleanPhone });

  if (!customer) {
    return res.status(200).json({
      status: 'success',
      data: null,
      message: 'No existing customer record found with this phone',
    });
  }

  res.status(200).json({
    status: 'success',
    data: customer,
  });
});

// @desc    Get customer loyalty ledger history
// @route   GET /api/v1/customers/:id/loyalty-history
// @access  Public
exports.getCustomerLoyaltyHistory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const history = await LoyaltyLedger.find({ customer: id }).sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: history.length,
    data: history,
  });
});

// @desc    Get all customers (for Admin dashboard)
// @route   GET /api/v1/customers
// @access  Private/Admin-Manager
exports.getCustomers = factory.getAll(Customer, 'Customers');

// @desc    Get specific customer by ID
// @route   GET /api/v1/customers/:id
// @access  Private/Admin-Manager
exports.getCustomer = factory.getOne(Customer);
