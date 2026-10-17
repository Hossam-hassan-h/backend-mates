const express = require('express');
const {
  lookupCustomerByPhone,
  getCustomerLoyaltyHistory,
  getCustomers,
  getCustomer,
} = require('../services/customerService');
const { deleteUser } = require('../services/userService');
const authService = require('../services/authService');

const router = express.Router();

router.get('/lookup', lookupCustomerByPhone);
router.get('/:id/loyalty-history', getCustomerLoyaltyHistory);

router.use(authService.protect, authService.allowedTo('admin', 'manager'));
router.route('/').get(getCustomers);
router
  .route('/:id')
  .get(getCustomer)
  .delete(authService.allowedTo('admin'), deleteUser);

module.exports = router;
