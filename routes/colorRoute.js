const express = require('express');
const {
  getColors,
  getColor,
  createColor,
  updateColor,
  deleteColor,
} = require('../services/colorService');
const authService = require('../services/authService');

const router = express.Router();

router
  .route('/')
  .get(getColors)
  .post(authService.protect, authService.allowedTo('admin', 'manager'), createColor);

router
  .route('/:id')
  .get(getColor)
  .put(authService.protect, authService.allowedTo('admin', 'manager'), updateColor)
  .delete(authService.protect, authService.allowedTo('admin'), deleteColor);

module.exports = router;
