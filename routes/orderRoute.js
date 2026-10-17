const express = require('express');
const {
  createOrder,
  findAllOrders,
  findSpecificOrder,
  updateOrderStatus,
} = require('../services/orderService');
const authService = require('../services/authService');

const router = express.Router();

router
  .route('/')
  .post(createOrder)
  .get(authService.protect, authService.allowedTo('admin', 'manager'), findAllOrders);

router.route('/:id').get(findSpecificOrder);

router.put(
  '/:id/status',
  authService.protect,
  authService.allowedTo('admin', 'manager'),
  updateOrderStatus
);

module.exports = router;
